import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { enableLabels, findAll, nodes } from './labels';

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

// A finger swipe, shown in the video; the app scrolls with the wheel, one step
// per frame so the list glides.
async function swipe(page: Page, x: number, y: number, dy: number) {
  await page.mouse.move(x, y);
  const started = now();
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await page.waitForTimeout(16);
  }
  events.push({ type: 'swipe', t: started, from: { x, y: y + dy / 4 }, to: { x, y: y - dy / 4 }, ms: now() - started });
  await page.waitForTimeout(600);
}

/** Tap the control labelled `match`, scrolling down to it if needed. */
async function tapOn(
  page: Page,
  match: string | RegExp,
  {
    settle = 1400,
    pick = 'top' as 'top' | 'bottom' | 'smallest',
    scroll = true,
    dir = 1,
    offset = 0,
    maxY = 915,
    x = undefined as number | undefined,
    fromTop = undefined as number | undefined,
  } = {},
) {
  for (let i = 0; i < 8; i++) {
    // Whole controls only: not a container that happens to start with the
    // label, and not one half cut off at the edge of the screen.
    const hits = (await findAll(page, match)).filter(
      (n) => n.h < 320 && n.h > 20 && n.y - n.h / 2 > 40 && n.y + n.h / 2 < 915 && n.y < maxY,
    );
    if (hits.length) {
      const n =
        pick === 'smallest'
          ? [...hits].sort((a, b) => a.w * a.h - b.w * b.h)[0]
          : pick === 'top'
            ? hits[0]
            : hits[hits.length - 1];
      if (DEBUG) console.log('tap', String(match), Math.round(n.x), Math.round(n.y), Math.round(n.w), Math.round(n.h));
      // `offset` taps a control below an unlabelled one's heading.
      // `x`/`fromTop` place the tap inside a row, e.g. on its switch.
      const ty = fromTop === undefined ? n.y + offset : n.y - n.h / 2 + fromTop;
      await tap(page, x ?? n.x, ty, settle);
      return;
    }
    if (!scroll) break;
    await swipe(page, 206, 600, 260 * dir);
  }
  throw new Error(`No "${match}" on screen. Labels: ${(await nodes(page)).map((n) => n.text.split('\n')[0]).join(' / ')}`);
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
  await enableLabels(page);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 824, maxHeight: 1830, everyNthFrame: 1 });
  log('start');

  chapter('Open the app', 'The splash screen loads my saved settings before the first screen.');
  await page.waitForTimeout(2600);
  await snap(page, 'onboarding');

  chapter('First-run tour', 'Three short pages introduce drink logging, Splash the hydration buddy, and badges, streaks and smart goals.');
  await page.waitForTimeout(1600);
  await tapOn(page, 'Next', { settle: 1700, scroll: false });
  await tapOn(page, 'Next', { settle: 1700, scroll: false });
  await tapOn(page, 'Get Started', { settle: 2600, scroll: false });
  await snap(page, 'dashboard');

  chapter('Meet the AI coach', 'Splash shows a tip from the AI coach: my Groq-powered function, written for this exact moment of the day.');
  await page.waitForTimeout(4200);
  await tapOn(page, /^Log a drink/, { settle: 1800 });
  await snap(page, 'sheet');

  chapter('Log a drink', 'Pick a drink type and an amount, then add it to the day.');
  await page.waitForTimeout(1400);
  await tapOn(page, /^Log \d+ml/, { settle: 2400, scroll: false });
  await snap(page, 'achievement');

  chapter('Unlock an achievement', 'The first logged drink earns the First Sip badge.');
  await page.waitForTimeout(1600);
  await tapOn(page, 'Nice!', { settle: 1600, scroll: false });
  await tapOn(page, /^Log a drink/, { settle: 1600 });
  await snap(page, 'sheet2');

  chapter('Mix in other drinks', 'Juice and coffee count by how hydrating they are: 1,000 ml of drinks adds 825 ml to the day.');
  await page.waitForTimeout(800);
  await tapOn(page, 'Juice', { settle: 900, scroll: false });
  await tapOn(page, /^Bottle/, { settle: 900, scroll: false });
  await tapOn(page, /^Log \d+ml/, { settle: 2200, scroll: false });
  await snap(page, 'after-juice');
  await tapOn(page, /^Log a drink/, { settle: 1600 });
  await tapOn(page, 'Coffee', { settle: 900, scroll: false });
  await tapOn(page, /^Log \d+ml/, { settle: 2200, scroll: false });
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
  await tapOn(page, /^stats$/i, { settle: 1800, scroll: false });
  await tapOn(page, 'Today', { settle: 2600, scroll: false });
  await snap(page, 'stats-today');
  await tapOn(page, 'Week', { settle: 2400, scroll: false });
  await tapOn(page, 'Month', { settle: 2600, scroll: false });
  await snap(page, 'stats-month');

  chapter('Profile and goals', 'Settings hold the daily goal, a goal worked out from weight and activity, and Smart Goal.');
  await tapOn(page, /^settings$/i, { settle: 2400, scroll: false });
  await tapOn(page, 'Personalized goal', { settle: 600, offset: 65, maxY: 520 });
  await page.keyboard.type('60', { delay: 120 });
  await page.waitForTimeout(500);
  await tapOn(page, 'Active', { settle: 1800, scroll: false, pick: 'smallest' });
  await tapOn(page, 'Use this', { settle: 1800, scroll: false, pick: 'smallest' });
  await snap(page, 'personal');

  chapter('Smart Goal', 'Smart Goal reads the live temperature for my city and raises the goal on hot days.');
  await page.waitForTimeout(600);
  await tapOn(page, /^Smart Goal/, { settle: 3200, scroll: false, x: 345, fromTop: 36 });
  await snap(page, 'smartgoal');
  await swipe(page, 206, 600, 500);
  await page.waitForTimeout(1200);
  await snap(page, 'theme');

  chapter('Reminders and theme', 'Reminder hours and quiet hours are set here, and an environment theme recolours the app.');
  await page.waitForTimeout(1600);
  await tapOn(page, 'Lagoon', { settle: 2400 });
  await snap(page, 'lagoon');
  await tapOn(page, 'Hydration Log', { settle: 2200 });
  await snap(page, 'history');

  chapter('Browse the history', 'The Hydration Log shows each day on a calendar and lists its drinks, ready to edit or delete.');
  await page.waitForTimeout(2600);
  await tap(page, 318, 676, 1800);
  await snap(page, 'edit');

  chapter('Edit an entry', 'I change the coffee to tea, which hydrates better, so the day rises from 825 ml to 900 ml.');
  await page.waitForTimeout(1200);
  await tapOn(page, 'Tea', { settle: 1200, scroll: false });
  await tapOn(page, 'Save changes', { settle: 2400, scroll: false });
  await snap(page, 'edited');
  await tap(page, 28, 29, 1600);
  await tapOn(page, /^home$/i, { settle: 2200, scroll: false });
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
