import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Screen recording of the Bulk Buying Companion preview build: the real Flutter
// app, compiled for the web, running on its built-in mock repositories (sample
// hubs and deals, a mock student sign-in, no backend). Taps, scrolls, captions
// and timings are logged so the video can draw the touches.

const OUT = __dirname + '/recording';
const events: Record<string, unknown>[] = [];
const now = () => Date.now() / 1000;
const log = (type: string, extra: Record<string, unknown> = {}) => events.push({ type, t: now(), ...extra });
const chapter = (title: string, text: string) => log('chapter', { title, text });

test.use({ colorScheme: 'dark' });

async function tap(page: Page, x: number, y: number, settle = 1600) {
  log('tap', { x, y });
  await page.mouse.click(x, y);
  await page.waitForTimeout(settle);
}

// A finger swipe, shown in the video; the app scrolls with the wheel. Many
// small wheel steps make the list glide; the swipe is logged with the time it
// really took, so the drawn finger moves exactly as long as the list scrolls.
async function swipe(page: Page, x: number, y: number, dy: number, _ms = 900) {
  await page.mouse.move(x, y);
  const started = now();
  const steps = 30;
  for (let i = 0; i < steps; i++) await page.mouse.wheel(0, dy / steps);
  events.push({ type: 'swipe', t: started, from: { x, y: y + dy / 4 }, to: { x, y: y - dy / 4 }, ms: now() - started });
  await page.waitForTimeout(500);
}

test('record the Bulk Buying flow', async ({ page }) => {
  test.setTimeout(240_000);
  mkdirSync(`${OUT}/frames`, { recursive: true });
  await page.goto('/');
  await page.waitForTimeout(5000);

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

  chapter('Find a hub', 'Browse nearby campus and dorm communities, sorted by distance.');
  await page.waitForTimeout(2600);
  await tap(page, 325, 232, 2200);

  chapter('Join the hub', 'Colon Street Hub becomes my current hub, and its count goes from 31 to 32 members.');
  await page.waitForTimeout(1500);
  await tap(page, 189, 165, 1800);

  chapter('Browse the Split Board', 'Compare per-share prices, quantities, open slots, and deadlines.');
  await page.waitForTimeout(1200);
  await swipe(page, 195, 560, 420);
  await page.waitForTimeout(900);
  await swipe(page, 195, 420, -420);
  await page.waitForTimeout(700);
  await tap(page, 175, 523, 1900);

  chapter('Review a deal', 'Check my share, the organiser, who has joined, and where to pick it up.');
  await page.waitForTimeout(1200);
  await swipe(page, 195, 560, 300);
  await page.waitForTimeout(900);
  await swipe(page, 195, 420, -300);
  await page.waitForTimeout(600);
  await tap(page, 195, 806, 1800);

  chapter('Reserve a share', 'The slot is mine: open slots drop to 2 of 5, and the amount I owe appears.');
  await page.waitForTimeout(2400);
  await tap(page, 29, 31, 1800);

  chapter('Back on the board', 'The rice sack now shows 2 of 5 slots open for everyone in the hub.');
  await page.waitForTimeout(2200);
  await tap(page, 301, 800, 1900);

  chapter('Post a deal', 'Describe a new bulk buy, or scan a receipt to fill the form in.');
  await page.waitForTimeout(1200);
  await tap(page, 195, 447, 700);
  log('type', { text: 'Cooking oil 5L × 4' });
  await page.keyboard.type('Cooking oil 5L x 4', { delay: 95 });
  await page.waitForTimeout(700);
  await tap(page, 78, 691, 1000);
  await swipe(page, 195, 600, 380, 1100);
  await page.waitForTimeout(2200);
  log('end');
  await page.waitForTimeout(300);
  await cdp.send('Page.stopScreencast');
  await page.waitForTimeout(300);
  writeFileSync(`${OUT}/frames.json`, JSON.stringify(frames));
  writeFileSync(`${OUT}/events.json`, JSON.stringify(events, null, 1));
  console.log('frames', frames.length);
});
