import { test, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// Screen recording of OpenEar for the portfolio video: the real Flutter app,
// compiled for the web (preview_offline.dart), starting on the home screen
// because sign-in needs the team's Firebase project. Notes, quizzes and
// progress are stored on the device, as the app does on the web. speech-stub.js
// stands in for the browser's speech engine (the video has no sound). The quiz
// is answered from the uploaded notes, read through the app's accessibility
// labels. DEBUG=1 saves a screenshot after each step.

const OUT = __dirname;
const NOTES = __dirname + '/programming-fundamentals.txt';
const DEBUG = process.env['DEBUG'] === '1';
const events: Record<string, unknown>[] = [];
const now = () => Date.now() / 1000;
const log = (type: string, extra: Record<string, unknown> = {}) => events.push({ type, t: now(), ...extra });
const chapter = (title: string, text: string) => log('chapter', { title, text });
let shot = 0;

async function snap(page: Page, name: string) {
  if (DEBUG) await page.screenshot({ path: `${OUT}/debug/${String(shot++).padStart(2, '0')}-${name}.png` });
}

async function tap(page: Page, x: number, y: number, settle = 1400) {
  log('tap', { x, y });
  await page.mouse.click(x, y);
  await page.waitForTimeout(settle);
}

// The current quiz question and its four options (with where each sits on
// screen), from the accessibility tree.
async function readQuestion(page: Page) {
  const nodes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('flt-semantics')).map((e) => {
      const r = e.getBoundingClientRect();
      return {
        text: (e.getAttribute('aria-label') || (e as HTMLElement).innerText || '').trim(),
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
      };
    }),
  );
  const single = nodes.filter((nd) => nd.text && !nd.text.includes('\n'));
  const question = (single.find((nd) => nd.text.includes('______')) ?? single.find((nd) => nd.text.endsWith('?')))?.text ?? '';
  const options = ['A', 'B', 'C', 'D'].map((k) => {
    const nd = single.find((o) => o.text.startsWith(k + ' ') && o.text !== question);
    return { text: nd?.text.slice(2) ?? '', x: nd?.x ?? 215, y: nd?.y ?? 344 };
  });
  const next = single.find((nd) => nd.text === 'Next Question' || nd.text === 'Show Results');
  return { question, options, next };
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

test('record the OpenEar flow', async ({ page }) => {
  test.setTimeout(400_000);
  mkdirSync(`${OUT}/frames`, { recursive: true });
  if (DEBUG) mkdirSync(`${OUT}/debug`, { recursive: true });
  const notes = squash(readFileSync(NOTES, 'utf8'));
  await page.addInitScript({ path: __dirname + '/speech-stub.js' });

  const frames: { t: number; file: string }[] = [];
  const cdp = await page.context().newCDPSession(page);
  let n = 0;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = `f${String(n++).padStart(5, '0')}.jpg`;
    writeFileSync(`${OUT}/frames/${file}`, Buffer.from(data, 'base64'));
    frames.push({ t: metadata.timestamp ?? now(), file });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await page.goto('/');
  await page.waitForTimeout(5500);
  await page.evaluate(() => (document.querySelector('flt-semantics-placeholder') as HTMLElement | null)?.click());
  await page.waitForTimeout(800);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 860, maxHeight: 1864, everyNthFrame: 1 });
  await page.waitForTimeout(400);
  log('start');

  chapter('Choose an activity', 'Large, high-contrast buttons lead to notes, quizzes, progress, and uploads, and each one is announced aloud.');
  await page.waitForTimeout(3200);
  await tap(page, 215, 402, 2000);
  await snap(page, 'upload');

  chapter('Upload study notes', 'A notes file is checked as it loads, and the app says whether it has enough content to quiz on.');
  await page.waitForTimeout(1200);
  const chooser = page.waitForEvent('filechooser');
  await tap(page, 215, 488, 300);
  await (await chooser).setFiles(NOTES);
  await page.waitForTimeout(3400);
  await snap(page, 'uploaded');
  await tap(page, 27, 27, 2200);
  await tap(page, 215, 216, 2200);
  await snap(page, 'read');

  chapter('Listen to notes', 'Tapping a saved note reads it aloud with text-to-speech; the video has no sound.');
  await page.waitForTimeout(1000);
  await tap(page, 180, 100, 3800);
  await tap(page, 215, 897, 2000);
  await snap(page, 'ask');

  chapter('Ask about the notes', 'Questions about a note are asked by voice; the microphone is not available in this recording.');
  await page.waitForTimeout(3000);
  await tap(page, 215, 589, 1400);
  await tap(page, 27, 27, 2400);
  await tap(page, 215, 286, 2600);
  await snap(page, 'quiz-list');

  chapter('Start a quiz', 'Only notes with enough content are offered; this one makes 8 questions.');
  await page.waitForTimeout(2200);
  await tap(page, 215, 110, 3200);
  await snap(page, 'q1');

  chapter('Answer questions', 'Each question is a sentence from the notes with a word missing; answers are tapped or spoken.');
  for (let q = 0; q < 8; q++) {
    const { question, options } = await readQuestion(page);
    let pick = options.findIndex((o) => o.text && notes.includes(squash(question.replace('______', o.text).replace(/\?$/, ''))));
    if (pick < 0) pick = 0;
    console.log('Q', q + 1, question.slice(0, 50), '->', options[pick].text.slice(0, 40));
    await page.waitForTimeout(q ? 900 : 1600);
    await tap(page, options[pick].x, options[pick].y, 1700);
    if (q === 0) await snap(page, 'answered');
    const { next } = await readQuestion(page);
    if (q === 7) await snap(page, 'last-answered');
    await tap(page, next?.x ?? 215, next?.y ?? 856, 1500);
  }
  await page.waitForTimeout(1200);
  await snap(page, 'results');

  chapter('See the results', 'The score is read out and saved to my progress.');
  await page.waitForTimeout(3600);
  await snap(page, 'results2');
  await tap(page, 300, 591, 2200);
  await tap(page, 27, 27, 2600);
  await tap(page, 215, 344, 2600);
  await snap(page, 'progress');

  chapter('Track progress', 'The Progress screen keeps each quiz score so I can see how my studying is going.');
  await page.waitForTimeout(4200);
  await snap(page, 'progress2');
  log('end');
  await page.waitForTimeout(300);
  await cdp.send('Page.stopScreencast');
  await page.waitForTimeout(300);
  writeFileSync(`${OUT}/frames.json`, JSON.stringify(frames));
  writeFileSync(`${OUT}/events.json`, JSON.stringify(events, null, 1));
  console.log('frames', frames.length);

});
