import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { FakeBackend } from '/Users/johncalen.nombrado/Desktop/mAIstra/maistra_web/tests/e2e/support/fake-backend';

// Screen recording of the real mAIstra interface for the portfolio video.
// JC's handwritten test pages from the 2026-10-01 end-to-end run, with the text
// the OCR pipeline produced for each. Supabase and the OCR server are faked, so
// nothing reaches the cloud project. Grading is real: our Judge0 VM over
// Tailscale, through mAIstra's own judge0_api wrapper on 127.0.0.1:8001.
//
// The browser is recorded with Chrome's screencast. A headless browser draws no
// mouse pointer, so every move, click, caption and zoom is logged with its time
// and the video renderer draws the pointer and camera from that log.

const OCR = '/Users/johncalen.nombrado/Desktop/mAIstra/ocr_feature/outputs';
const PAGES = [
  's01_ec0131b9', 's02_ead0a238', 's03_d1dda656', 's04_35126d97', 's05_c659275b', 's06_0fcce4fa',
  's07_43b4b844', 's08_279d949d', 's09_74e02463', 's10_38b7c500', 's11_ad682f93',
];
const OUT = __dirname + '/recording';
const W = 1440, H = 1000;
const Q1 = '11111111-1111-4111-8111-111111111111';
const Q2 = '22222222-2222-4222-8222-222222222222';
const SQUARE = 'int square(int n) {\n    return n * n;\n}';
const CUBE = 'int cube(int n) {\n    return n * n * n;\n}';

const events: Record<string, unknown>[] = [];
const now = () => Date.now() / 1000;
let pointer = { x: 1240, y: 900 };

function log(type: string, extra: Record<string, unknown> = {}) {
  events.push({ type, t: now(), ...extra });
}

async function center(locator: Locator) {
  const box = await locator.first().boundingBox();
  if (!box) throw new Error('no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function box(locator: Locator) {
  const b = await locator.first().boundingBox();
  if (!b) throw new Error('no box');
  return [b.x / W, b.y / H, (b.x + b.width) / W, (b.y + b.height) / H];
}

// Glide the (drawn) pointer to x, y over ms, then really move there.
async function moveTo(page: Page, x: number, y: number, ms = 750) {
  log('move', { from: pointer, to: { x, y }, ms: ms / 1000 });
  await page.waitForTimeout(ms);
  await page.mouse.move(x, y);
  pointer = { x, y };
}

async function clickAt(page: Page, x: number, y: number, ms = 750, count = 1) {
  await moveTo(page, x, y, ms);
  await page.waitForTimeout(120);
  log('click', { x, y });
  await page.mouse.click(x, y, { clickCount: count });
}

async function click(page: Page, locator: Locator, ms = 750) {
  const c = await center(locator);
  await clickAt(page, c.x, c.y, ms);
}

function chapter(title: string, text: string) {
  log('chapter', { title, text });
}

// Camera: a rectangle of the viewport as fractions, or null for the whole view.
function zoom(rect: number[] | null, ms = 900) {
  log('zoom', { rect, ms: ms / 1000 });
}

// Screen position of a piece of text in the n-th Ace editor.
async function textAt(page: Page, index: number, needle: string) {
  return page.evaluate(([i, n]) => {
    const host = document.querySelectorAll('app-code-editor .ace_editor')[i as number] as any;
    const editor = host.env.editor;
    const range = editor.find(n, { wrap: true, caseSensitive: true, preventScroll: true });
    editor.clearSelection();
    const a = editor.renderer.textToScreenCoordinates(range.start.row, range.start.column);
    const b = editor.renderer.textToScreenCoordinates(range.end.row, range.end.column);
    const half = editor.renderer.lineHeight / 2;
    return { x1: a.pageX, x2: b.pageX, y: a.pageY + half, row: range.start.row };
  }, [index, needle] as const);
}

// Scroll the dialog with the wheel (under the pointer) until locator sits in view.
async function scrollTo(page: Page, locator: Locator) {
  const b = await locator.first().boundingBox();
  if (!b) throw new Error('no box');
  const dy = b.y < 260 ? b.y - 260 : b.y + b.height > H - 120 ? b.y + b.height - (H - 120) : 0;
  if (!dy) return;
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(350);
}

// Grow a camera rectangle a little so the subject is not flush with the edge.
function pad(r: number[]) {
  const m = 0.03;
  return [Math.max(0, r[0] - m), Math.max(0, r[1] - m), Math.min(1, r[2] + m), Math.min(1, r[3] + m)];
}

test('record the mAIstra review flow', async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(`${OUT}/frames`, { recursive: true });
  const backend = new FakeBackend();
  await backend.install(page);
  await page.unroute('http://127.0.0.1:8001/api/judge0/**');
  const section = backend.addSection('E2E TEST');
  backend.addQuestion({
    id: Q1,
    question_name: 'Square a number',
    question_text: 'Write int square(int n), which returns n squared.',
    question_type: 'function',
    model_answer: SQUARE,
    test_cases: [
      { test_code: 'printf("%d", square(4));', test_input: '', expected_output: '16' },
      { test_code: 'printf("%d", square(-3));', test_input: '', expected_output: '9' },
    ],
    can_publish: true,
    created_at: '2026-09-30T16:00:00Z',
  });
  backend.addQuestion({
    id: Q2,
    question_name: 'Cube a number',
    question_text: 'Write int cube(int n), which returns n cubed.',
    question_type: 'function',
    model_answer: CUBE,
    test_cases: [
      { test_code: 'printf("%d", cube(2));', test_input: '', expected_output: '8' },
      { test_code: 'printf("%d", cube(-3));', test_input: '', expected_output: '-27' },
    ],
    can_publish: true,
    created_at: '2026-09-30T16:05:00Z',
  });
  backend.addSectionItem(section.id, Q1, 1);
  backend.addSectionItem(section.id, Q2, 2);
  PAGES.forEach((name, index) => {
    const image = readFileSync(`${OCR}/${name}_preprocessed.jpg`).toString('base64');
    const text = JSON.parse(readFileSync(`${OCR}/debug/${name}_preprocessed.json`, 'utf8')).cleaned_text;
    const hex = name.split('_')[1];
    backend.addSubmission({
      id: `${hex}-0000-4000-8000-${hex}0000`,
      image_url: `data:image/jpeg;base64,${image}`,
      // One batch a minute apart, page 1 newest so it leads the list.
      captured_at: new Date(Date.UTC(2026, 8, 30, 17, 50 - index)).toISOString(),
      status: 'pending',
      student_name: 'JC · test page',
      extracted_text: text,
      question_id: Q1,
      gate_result: 'FIXABLE',
    });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Submissions' })).toBeVisible();
  await expect.poll(() => backend.realtimeSubscribed).toBe(true);
  const nav = page.getByRole('navigation', { name: 'Main' });
  await nav.getByRole('button', { name: 'Question bank' }).click();
  await page.waitForTimeout(800);

  // Start recording.
  const frames: { t: number; file: string }[] = [];
  const cdp = await page.context().newCDPSession(page);
  let n = 0;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = `f${String(n++).padStart(5, '0')}.jpg`;
    writeFileSync(`${OUT}/frames/${file}`, Buffer.from(data, 'base64'));
    frames.push({ t: metadata.timestamp ?? now(), file });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 });
  await page.waitForTimeout(400);
  log('start');

  chapter('Prepare questions', 'Each question in the bank carries its own test cases, such as square(4) → 16.');
  await page.waitForTimeout(1000);
  zoom(await box(page.locator('main').first()).then(([x0, y0]) => [0.05, 0.04, 0.7, 0.49].map((v, i) => v + 0 * (i ? y0 : x0))));
  await page.waitForTimeout(2600);
  zoom(null, 700);
  await click(page, nav.getByRole('button', { name: 'Submissions' }), 900);

  chapter('Find the paper', 'My 11 handwritten test pages from our end-to-end run, already read by OCR.');
  await page.waitForTimeout(900);
  zoom([0.05, 0.03, 0.71, 0.5]);
  await page.waitForTimeout(1600);
  const card = page.locator('.submission-card').filter({ hasText: '01:50' });
  await moveTo(page, ...(Object.values(await center(card)) as [number, number]), 900);
  await page.waitForTimeout(600);
  zoom(null, 600);
  await page.waitForTimeout(500);
  log('click', pointer);
  await page.mouse.click(pointer.x, pointer.y);

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  chapter('Check the question', 'The page was submitted to Q1, which supplies its grading test cases.');
  await page.waitForTimeout(700);
  zoom([0.3, 0.17, 0.92, 0.6]);
  await page.waitForTimeout(2400);
  zoom(null, 700);
  await click(page, dialog.getByRole('button', { name: 'Save and review code' }), 1000);
  await expect(dialog.getByRole('heading', { name: 'Review extracted code' })).toBeVisible();

  chapter('Read the OCR text', 'OCR read square as sgvare and * as #, and put both questions in one program.');
  await page.waitForTimeout(800);
  zoom([0.09, 0.27, 0.79, 0.76]);
  await page.waitForTimeout(3200);
  zoom([0.4, 0.38, 0.84, 0.69], 900);
  await page.waitForTimeout(1400);

  chapter('Fix the misreads', 'Correct each misread character, then keep only Question 1 in this tab.');
  let at = await textAt(page, 0, 'sgvare');
  await clickAt(page, (at.x1 + at.x2) / 2, at.y, 900, 2);
  await page.waitForTimeout(400);
  await page.keyboard.type('square', { delay: 110 });
  await page.waitForTimeout(500);
  at = await textAt(page, 0, '#');
  await clickAt(page, at.x2 + 1, at.y, 800);
  await page.waitForTimeout(250);
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(250);
  await page.keyboard.type('*', { delay: 100 });
  await page.waitForTimeout(600);
  // Drop the "Question 1;" label line.
  at = await textAt(page, 0, 'Question 1;');
  await clickAt(page, at.x2, at.y, 800);
  await page.keyboard.press('Shift+Home');
  await page.waitForTimeout(300);
  await page.keyboard.press('Shift+Home');
  await page.waitForTimeout(300);
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(600);
  // Select Question 2 by dragging, then remove it from this tab.
  const q2 = await textAt(page, 0, 'Question 2;');
  const last = await page.evaluate(() => {
    const editor = (document.querySelectorAll('app-code-editor .ace_editor')[0] as any).env.editor;
    const row = editor.session.getLength() - 1;
    const end = editor.renderer.textToScreenCoordinates(row, editor.session.getLine(row).length);
    return { x: end.pageX, y: end.pageY + editor.renderer.lineHeight / 2 };
  });
  const startX = q2.x1 - 18;
  await moveTo(page, startX, q2.y, 800);
  log('drag', { from: { x: startX, y: q2.y }, to: last });
  await page.mouse.down();
  await page.mouse.move(last.x, last.y, { steps: 20 });
  log('move', { from: { x: startX, y: q2.y }, to: last, ms: 0.5 });
  await page.waitForTimeout(500);
  pointer = last;
  await page.mouse.up();
  await page.waitForTimeout(700);
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(500);
  await click(page, dialog.getByRole('button', { name: 'Format code' }), 900);
  await page.waitForTimeout(1300);

  chapter('Split out Question 2', 'Add a tab for the second program, paste its code, and link it to Q2.');
  zoom([0.38, 0.22, 0.9, 0.58], 800);
  await click(page, dialog.getByRole('button', { name: 'Add program' }), 900);
  await page.waitForTimeout(600);
  const second = dialog.locator('app-code-editor').nth(1).locator('.ace_content');
  await click(page, second, 800);
  await page.waitForTimeout(300);
  // Pasted from the OCR reading, exactly as the OCR read it.
  await page.keyboard.insertText('int cube (int n) {\n    return n* n * n;\n}');
  await page.waitForTimeout(900);
  await click(page, dialog.locator('.question-picker-button'), 900);
  await page.waitForTimeout(1100);
  await click(page, dialog.getByRole('option', { name: /Cube a number/ }), 900);
  await page.waitForTimeout(900);

  chapter('Save both programs', 'One save stores every program on the paper, each with its own question.');
  await click(page, dialog.locator('.program-save-button'), 900);
  await page.waitForTimeout(2200);
  zoom(null, 700);
  await click(page, dialog.getByRole('button', { name: 'Continue to grading' }), 1100);
  await expect(dialog.getByRole('heading', { name: 'Run and grade' })).toBeVisible();

  chapter('Run a sample', 'Run Sample compiles the saved code on our Judge0 server over Tailscale. It prints 16, as expected.');
  await page.waitForTimeout(700);
  await click(page, dialog.getByRole('button', { name: 'Run Sample' }), 1000);
  await expect(dialog.locator('.terminal-results')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(500);
  await scrollTo(page, dialog.locator('.terminal-results'));
  zoom(await box(dialog.locator('.terminal-results')).then(pad));
  await page.waitForTimeout(3000);
  zoom(null, 700);
  await page.waitForTimeout(500);

  chapter('Grade against test cases', 'Submit Code runs every Q1 test case on Judge0: square(4) gives 16 and square(-3) gives 9. Score: 100%.');
  await scrollTo(page, dialog.getByRole('button', { name: 'Submit Code' }));
  await click(page, dialog.getByRole('button', { name: 'Submit Code' }), 900);
  await expect(dialog.locator('.submit-results')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(500);
  await scrollTo(page, dialog.locator('.submit-results'));
  zoom(await box(dialog.locator('.submit-results')).then(pad));
  await page.waitForTimeout(3400);
  zoom(null, 700);
  await page.waitForTimeout(400);

  chapter('Grade Program 2', 'The cube program runs against Q2\'s own test cases: 8 and -27, both accepted.');
  await scrollTo(page, dialog.locator('.grading-programs'));
  await click(page, dialog.getByRole('tab', { name: /Program 2/ }), 1000);
  await page.waitForTimeout(900);
  await scrollTo(page, dialog.getByRole('button', { name: 'Submit Code' }));
  await click(page, dialog.getByRole('button', { name: 'Submit Code' }), 900);
  await expect(dialog.locator('.submit-results')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(500);
  await scrollTo(page, dialog.locator('.submit-results'));
  zoom(await box(dialog.locator('.submit-results')).then(pad));
  await page.waitForTimeout(3400);
  zoom(null, 700);
  await page.waitForTimeout(400);

  chapter('Paper graded', 'Both programs on the handwritten page show 2/2 passed.');
  await scrollTo(page, dialog.locator('.grading-programs'));
  await page.waitForTimeout(500);
  zoom(await box(dialog.locator('.grading-programs')).then(pad));
  await page.waitForTimeout(2800);
  log('end');
  await page.waitForTimeout(300);
  await cdp.send('Page.stopScreencast');
  await page.waitForTimeout(300);
  writeFileSync(`${OUT}/frames.json`, JSON.stringify(frames));
  writeFileSync(`${OUT}/events.json`, JSON.stringify(events, null, 1));
  console.log('frames', frames.length, 'unexpected', JSON.stringify(backend.unexpected));
});
