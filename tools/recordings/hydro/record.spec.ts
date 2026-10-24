import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Screen recording of Hydro-Tracker for the portfolio video: the real Flutter
// app, compiled for the web (preview_offline.dart), with its data kept on the
// device because the Supabase project behind sign-in no longer exists. The AI
// coach is the app's own Supabase function (supabase/functions/coach), run on
// this Mac with my Groq key. Taps, swipes, captions and timings are logged so
// the video can draw the touches. DEBUG=1 saves a screenshot after each step.

const OUT = __dirname;
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

async function swipe(page: Page, x: number, y: number, dy: number) {
  await page.mouse.move(x, y);
  const started = now();
  const steps = 30;
  for (let i = 0; i < steps; i++) await page.mouse.wheel(0, dy / steps);
  events.push({ type: 'swipe', t: started, from: { x, y: y + dy / 4 }, to: { x, y: y - dy / 4 }, ms: now() - started });
  await page.waitForTimeout(600);
}

test('record the Hydro-Tracker flow', async ({ page }) => {
  test.setTimeout(400_000);
  mkdirSync(`${OUT}/frames`, { recursive: true });
  if (DEBUG) mkdirSync(`${OUT}/debug`, { recursive: true });

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
  await page.waitForTimeout(900);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 824, maxHeight: 1830, everyNthFrame: 1 });
  log('start');

  chapter('Open the app', 'The splash screen loads my saved settings before the first screen.');
  await page.waitForTimeout(2600);
  await snap(page, 'onboarding');

  chapter('First-run tour', 'Three short pages introduce drink logging, Splash the hydration buddy, and badges, streaks and smart goals.');
  await page.waitForTimeout(1600);
  await tap(page, 206, 861, 1700);
  await tap(page, 206, 861, 1700);
  await tap(page, 206, 861, 2600);
  await snap(page, 'dashboard');

  chapter('Meet the AI coach', 'Splash shows a tip from the AI coach: my Groq-powered function, written for this exact moment of the day.');
  await page.waitForTimeout(4200);
  await swipe(page, 206, 600, 500);
  await page.waitForTimeout(500);
  await tap(page, 206, 755, 1800);
  await snap(page, 'sheet');

  chapter('Log a drink', 'Pick a drink type and an amount, then add it to the day.');
  await page.waitForTimeout(1400);
  await tap(page, 206, 869, 2400);
  await snap(page, 'achievement');

  chapter('Unlock an achievement', 'The first logged drink earns the First Sip badge.');
  await page.waitForTimeout(1600);
  await tap(page, 206, 591, 1600);
  await tap(page, 206, 725, 1600);
  await snap(page, 'sheet2');

  chapter('Mix in other drinks', 'Juice and coffee count by how hydrating they are: 1,000 ml of drinks adds 825 ml to the day.');
  await page.waitForTimeout(800);
  await tap(page, 206, 623, 900);
  await tap(page, 270, 763, 900);
  await tap(page, 206, 869, 2200);
  await snap(page, 'after-juice');
  await tap(page, 206, 725, 1600);
  await tap(page, 358, 623, 900);
  await tap(page, 206, 869, 2200);
  await snap(page, 'after-coffee');
  await swipe(page, 206, 400, -900);
  await page.waitForTimeout(1500);
  await snap(page, 'top-after');

  chapter('See today’s mix', 'Scrolling down shows each drink’s share of the day.');
  await page.waitForTimeout(3000);
  await swipe(page, 206, 600, 700);
  await page.waitForTimeout(2600);
  await snap(page, 'mix');

  chapter('Check the stats', 'Statistics show the day hour by hour, the last seven days, and the last 30.');
  await tap(page, 206, 870, 1800);
  await tap(page, 84, 177, 2600);
  await snap(page, 'stats-today');
  await tap(page, 206, 177, 2400);
  await tap(page, 327, 177, 2600);
  await snap(page, 'stats-month');

  chapter('Profile and goals', 'Settings hold the daily goal, a goal worked out from weight and activity, and Smart Goal.');
  await tap(page, 335, 870, 2400);
  await swipe(page, 206, 600, 700);
  await page.waitForTimeout(1200);
  await snap(page, 'settings1');
  await tap(page, 206, 168, 600);
  await page.keyboard.type('60', { delay: 120 });
  await page.waitForTimeout(500);
  await tap(page, 294, 215, 1800);
  await tap(page, 338, 299, 1800);
  await snap(page, 'personal');

  chapter('Smart Goal', 'Smart Goal reads the live temperature for my city and raises the goal on hot days.');
  await page.waitForTimeout(600);
  await tap(page, 345, 381, 3200);
  await snap(page, 'smartgoal');
  await swipe(page, 206, 600, 700);
  await page.waitForTimeout(1200);
  await snap(page, 'theme');

  chapter('Reminders and theme', 'Reminder hours and quiet hours are set here, and an environment theme recolours the app.');
  await page.waitForTimeout(1600);
  await tap(page, 206, 645, 2400);
  await snap(page, 'lagoon');
  await swipe(page, 206, 600, 500);
  await page.waitForTimeout(800);
  await snap(page, 'data');
  await tap(page, 206, 571, 2200);
  await snap(page, 'history');

  chapter('Browse the history', 'The Hydration Log shows each day on a calendar and lists its drinks, ready to edit or delete.');
  await page.waitForTimeout(2600);
  await tap(page, 318, 676, 1800);
  await snap(page, 'edit');

  chapter('Edit an entry', 'I change the coffee to tea, which hydrates better, so the day rises from 825 ml to 900 ml.');
  await page.waitForTimeout(1200);
  await tap(page, 150, 746, 1200);
  await tap(page, 206, 869, 2400);
  await snap(page, 'edited');
  await tap(page, 28, 29, 1600);
  await tap(page, 76, 870, 2200);
  await swipe(page, 206, 400, -1200);

  chapter('Back to today', 'Back on Home, the ring and the coach’s tip reflect the updated day.');
  await page.waitForTimeout(5000);
  await snap(page, 'final');
  log('end');
  await page.waitForTimeout(300);
  await cdp.send('Page.stopScreencast');
  await page.waitForTimeout(300);
  writeFileSync(`${OUT}/frames.json`, JSON.stringify(frames));
  writeFileSync(`${OUT}/events.json`, JSON.stringify(events, null, 1));
  console.log('frames', frames.length);
});
