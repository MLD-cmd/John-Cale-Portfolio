import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { enableLabels, findAll, nodes } from './labels';

// Screen recording of the full Bulk Buying Companion flow: the real Flutter
// app, compiled for the web, running on its built-in mock repositories (sample
// hubs, deals and a sample student account; no backend). preview_full.dart
// starts it signed out, keeps reservations per deal, and has three sample
// classmates join the deal the student posts, so the organiser's side can be
// shown. Controls are found by their accessibility labels (labels.ts). Taps,
// swipes, captions and timings are logged so the video can draw the touches.
// DEBUG=1 also saves a screenshot after each step.

const OUT = __dirname;
const DEBUG = process.env['DEBUG'] === '1';
const events: Record<string, unknown>[] = [];
const now = () => Date.now() / 1000;
const log = (type: string, extra: Record<string, unknown> = {}) => events.push({ type, t: now(), ...extra });
const chapter = (title: string, text: string) => log('chapter', { title, text });
let shot = 0;

test.use({ colorScheme: 'dark' });

async function snap(page: Page, name: string) {
  if (DEBUG) await page.screenshot({ path: `${OUT}/debug/${String(shot++).padStart(2, '0')}-${name}.png` });
}

async function tap(page: Page, x: number, y: number, settle = 1400) {
  log('tap', { x, y });
  await page.mouse.click(x, y);
  await page.waitForTimeout(settle);
}

async function type(page: Page, text: string, delay = 70) {
  await page.keyboard.type(text, { delay });
  await page.waitForTimeout(350);
}

// A finger swipe, shown in the video; the app scrolls with the wheel, one step
// per frame so the list glides. The swipe is logged with the time it really
// took, so the drawn finger moves exactly as long as the list scrolls.
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
  { settle = 1400, pick = 'top' as 'top' | 'bottom', band = [56, 844] as [number, number], scroll = true } = {},
) {
  for (let i = 0; i < 8; i++) {
    // Whole controls only: not a container that happens to start with the
    // label, and not one half cut off at the edge of the screen.
    const hits = (await findAll(page, match)).filter(
      (n) => n.h < 320 && n.h > 24 && n.y - n.h / 2 > band[0] && n.y + n.h / 2 < band[1],
    );
    if (hits.length) {
      const n = pick === 'top' ? hits[0] : hits[hits.length - 1];
      if (DEBUG) console.log('tap', String(match), Math.round(n.x), Math.round(n.y), Math.round(n.w), Math.round(n.h));
      await tap(page, n.x, n.y, settle);
      return;
    }
    if (!scroll) break;
    await swipe(page, 195, 560, 260);
  }
  throw new Error(`No "${match}" on screen. Labels: ${(await nodes(page)).map((n) => n.text.split('\n')[0]).join(' / ')}`);
}

test('record the full Bulk Buying flow', async ({ page }) => {
  test.setTimeout(400_000);
  mkdirSync(`${OUT}/frames`, { recursive: true });
  if (DEBUG) mkdirSync(`${OUT}/debug`, { recursive: true });
  await page.goto('/');
  await page.waitForTimeout(6500);
  await enableLabels(page);

  const frames: { t: number; file: string }[] = [];
  const cdp = await page.context().newCDPSession(page);
  let n = 0;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = `f${String(n++).padStart(5, '0')}.jpg`;
    writeFileSync(`${OUT}/frames/${file}`, Buffer.from(data, 'base64'));
    frames.push({ t: metadata.timestamp ?? now(), file });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  await page.waitForTimeout(400);
  log('start');

  chapter('Sign in', 'Students sign in with their campus email.');
  await page.waitForTimeout(1500);
  await tapOn(page, 'Email', { settle: 500 });
  await type(page, 'student@usjr.edu.ph');
  await tapOn(page, 'Password', { settle: 500 });
  await type(page, 'Student123', 90);
  await tapOn(page, 'Log in', { settle: 2400 });
  await snap(page, 'hubs');

  chapter('Find a hub', 'Nearby campus and dorm hubs are listed by distance.');
  await page.waitForTimeout(2200);
  await tapOn(page, 'Join', { settle: 2000 });
  await snap(page, 'joined');

  chapter('Join the hub', 'Colon Street Hub becomes my current hub, and its count goes from 31 to 32 members.');
  await page.waitForTimeout(1800);
  await tap(page, 357, 32, 1800);
  await snap(page, 'profile');

  chapter('Set my interests', 'In my profile I choose Grocery and Drinks, so matching deals are recommended first.');
  await page.waitForTimeout(900);
  await tapOn(page, 'Edit categories', { settle: 1300 });
  await tapOn(page, 'Grocery', { settle: 600, scroll: false });
  await tapOn(page, 'Drinks', { settle: 800, scroll: false });
  await tapOn(page, 'Save', { settle: 1600, scroll: false });
  await snap(page, 'prefs-saved');
  await tap(page, 28, 32, 1400);
  await tapOn(page, 'View deals', { settle: 2200 });
  await snap(page, 'board');

  chapter('Get recommendations', 'The Split Board opens with picks that match my interests, each with the reason it was picked.');
  await page.waitForTimeout(3200);
  await tapOn(page, /^Filters/, { settle: 1600, scroll: false });
  await snap(page, 'filters');

  chapter('Filter the board', 'Filters narrow the board by category, status, or deadline; here, Grocery only.');
  await page.waitForTimeout(800);
  await tapOn(page, /^Category/, { settle: 1100, scroll: false });
  await tapOn(page, 'Grocery', { settle: 900, pick: 'bottom', scroll: false });
  await tapOn(page, 'Show deals', { settle: 1800, scroll: false });
  await snap(page, 'filtered');
  await page.waitForTimeout(1200);
  await tapOn(page, /^Grocery 25kg Rice Sack/, { settle: 1900, pick: 'bottom', scroll: false });
  await snap(page, 'deal');

  chapter('Review a deal', 'The deal shows my share, open slots, the pickup point, and who has already joined.');
  await page.waitForTimeout(1600);
  await swipe(page, 195, 560, 320);
  await page.waitForTimeout(900);
  await swipe(page, 195, 420, -320);
  await page.waitForTimeout(500);
  await tapOn(page, 'Reserve a slot', { settle: 1800, band: [70, 840], scroll: false });
  await snap(page, 'reserved');

  chapter('Reserve a share', 'My slot is reserved: open slots drop to 2 of 5, and the amount I owe appears.');
  await page.waitForTimeout(2600);
  await tap(page, 28, 32, 1600);
  await tapOn(page, 'Post a deal', { settle: 1900, band: [70, 840], scroll: false });
  await snap(page, 'post');

  chapter('Post my own deal', 'I start a bulk buy for my hub: what it is, the total price, the amount, and how many students split it.');
  await page.waitForTimeout(900);
  await tapOn(page, 'Product name', { settle: 500 });
  await type(page, 'Cooking oil 5L x 4');
  await tapOn(page, 'Total price', { settle: 400 });
  await type(page, '1200');
  await tapOn(page, 'Total amount', { settle: 400 });
  await type(page, '20');
  await tapOn(page, /^Unit/, { settle: 900 });
  await tapOn(page, 'Litres (L)', { settle: 800, scroll: false });
  await tapOn(page, 'Slots', { settle: 400 });
  await type(page, '4');
  await page.waitForTimeout(1400);
  await snap(page, 'split');

  chapter('Review and publish', 'The form works out each share, P300 for 5 L, and I add the pickup point and payment method.');
  await tapOn(page, 'Pickup location', { settle: 400 });
  await type(page, 'USJR Main Gate');
  await tapOn(page, 'Payment method (optional)', { settle: 400 });
  await type(page, 'GCash');
  await swipe(page, 195, 600, 700);
  await page.waitForTimeout(1200);
  await snap(page, 'review');
  await tapOn(page, 'Publish deal', { settle: 2600 });
  await snap(page, 'published');

  chapter('Check notifications', 'Three hubmates reserved the rest of my deal, and I get a reminder to pay for my rice share.');
  await page.waitForTimeout(1500);
  await tap(page, 28, 32, 1600);
  await tap(page, 213, 32, 2000);
  await snap(page, 'notifications');
  await page.waitForTimeout(3600);

  chapter('Find my deal', 'Back on the board, searching “oil” brings up the deal I posted, now full.');
  await tap(page, 28, 32, 1500);
  await tapOn(page, 'View deals', { settle: 2000 });
  await tapOn(page, /^Search by product/, { settle: 600, scroll: false });
  await type(page, 'oil', 120);
  await page.waitForTimeout(1200);
  await snap(page, 'board-again');
  await tapOn(page, /^Grocery Cooking oil 5L x 4/, { settle: 2000, pick: 'bottom', scroll: false });
  await snap(page, 'mydeal');

  chapter('Organise the deal', 'As organiser I see the full deal and everyone in it, with a button to record each payment.');
  await page.waitForTimeout(1800);
  await swipe(page, 195, 600, 400);
  await swipe(page, 195, 600, 400);
  await snap(page, 'members');
  await page.waitForTimeout(800);

  chapter('Record payments', 'I mark each classmate paid as their GCash payment arrives, until everyone has paid.');
  await page.waitForTimeout(600);
  for (let i = 0; i < 3; i++) await tapOn(page, 'Mark paid', { settle: 1100 });
  await page.waitForTimeout(400);
  await snap(page, 'allpaid');

  chapter('Buy the goods', 'Confirming the purchase locks the reservations and opens a pickup checklist.');
  await page.waitForTimeout(600);
  await tapOn(page, /^I.ve bought it$/, { settle: 1600, band: [70, 840], scroll: false });
  await tapOn(page, /^I.ve bought it$/, { settle: 1800, scroll: false });
  await swipe(page, 195, 400, -600);
  await snap(page, 'checklist');

  chapter('Hand out shares', 'I tick off each pickup at the gate; once everyone has collected, the deal is Completed.');
  await page.waitForTimeout(800);
  for (let i = 0; i < 3; i++) await tapOn(page, 'Mark collected', { settle: 1100 });
  await swipe(page, 195, 400, -1500);
  await page.waitForTimeout(1800);
  await snap(page, 'completed');

  chapter('My history', 'My profile keeps the deals I organised and the ones I joined.');
  await tap(page, 28, 32, 1400);
  await tap(page, 28, 32, 1400);
  await tap(page, 357, 32, 1800);
  await swipe(page, 195, 600, 500);
  await page.waitForTimeout(1400);
  await swipe(page, 195, 600, 350);
  await page.waitForTimeout(2200);
  await snap(page, 'history');
  log('end');
  await page.waitForTimeout(300);
  await cdp.send('Page.stopScreencast');
  await page.waitForTimeout(300);
  writeFileSync(`${OUT}/frames.json`, JSON.stringify(frames));
  writeFileSync(`${OUT}/events.json`, JSON.stringify(events, null, 1));
  console.log('frames', frames.length);
});
