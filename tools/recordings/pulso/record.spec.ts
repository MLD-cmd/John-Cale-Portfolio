import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Screen recording of Pulso for the portfolio video: the real Flutter app,
// compiled for the web and signed in to my account on our team's live
// Supabase project (sign-in.spec.ts saves the session to PULSO_STATE). This
// writes to the live database: it sets my profile name and bio, shares a post
// made from media/, and likes and comments on my own post. Other members' posts
// are kept out of frame. Stories are left out: the app reads the story photo as
// a dart:io File, which only works on a phone. My email shows on the profile
// until the name is saved; it was blurred in the first frames afterwards.
// DEBUG=1 saves a screenshot per step.

const OUT = import.meta.dirname;
const MEDIA = OUT + '/media';
const DEBUG = process.env['DEBUG'] === '1';
const SHOTS = process.env['PULSO_DEBUG'] ?? `${OUT}/debug`;
test.use({ storageState: process.env['PULSO_STATE'] });

const events: Record<string, unknown>[] = [];
const now = () => Date.now() / 1000;
const log = (type: string, extra: Record<string, unknown> = {}) => events.push({ type, t: now(), ...extra });
const chapter = (title: string, text: string) => log('chapter', { title, text });
let shot = 0;

async function snap(page: Page, name: string) {
  if (DEBUG) await page.screenshot({ path: `${SHOTS}/${String(shot++).padStart(2, '0')}-${name}.png` });
}

async function tap(page: Page, x: number, y: number, settle = 1400) {
  log('tap', { x, y });
  await page.mouse.click(x, y);
  await page.waitForTimeout(settle);
}

async function type(page: Page, text: string, delay = 70) {
  await page.keyboard.type(text, { delay });
  await page.waitForTimeout(500);
}

// Controls on screen, from the app's accessibility tree.
async function find(page: Page, match: RegExp) {
  const nodes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('flt-semantics')).map((e) => {
      const r = e.getBoundingClientRect();
      return {
        text: (e.getAttribute('aria-label') || (e as HTMLElement).innerText || '').trim(),
        role: e.getAttribute('role') ?? '',
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
        w: r.width,
      };
    }),
  );
  return nodes.filter((n) => n.w < 390 && match.test(n.text));
}

async function pick(page: Page, x: number, y: number, file: string, settle = 2400) {
  const chooser = page.waitForEvent('filechooser');
  await tap(page, x, y, 300);
  await (await chooser).setFiles(`${MEDIA}/${file}`);
  await page.waitForTimeout(settle);
}

test('record the Pulso flow', async ({ page }) => {
  test.setTimeout(400_000);
  mkdirSync(`${OUT}/frames`, { recursive: true });
  if (DEBUG) mkdirSync(SHOTS, { recursive: true });

  await page.goto('/');
  await page.waitForTimeout(6500);
  await page.evaluate(() => (document.querySelector('flt-semantics-placeholder') as HTMLElement | null)?.click());
  await page.waitForTimeout(800);
  // Start on my profile, away from other members' posts in the feed.
  await page.mouse.click(351, 814);
  await page.waitForTimeout(2500);

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
  await snap(page, 'profile');

  chapter('Set up my profile', 'A new account starts with just an email; Edit Profile sets a display name, a username, and a bio.');
  await page.waitForTimeout(1800);
  await tap(page, 195, 221, 2200);
  await tap(page, 195, 288, 600);
  await type(page, 'John Cale');
  await tap(page, 195, 384, 600);
  await type(page, 'johncale.n');
  await tap(page, 195, 479, 600);
  await type(page, 'CS student in Cebu. Building Pulso with my team.', 45);
  await snap(page, 'edit-filled');
  await tap(page, 343, 28, 3000);
  await snap(page, 'profile-saved');

  chapter('Share a photo post', 'A post holds one or more photos and a caption; the image goes to Supabase Storage.');
  await page.waitForTimeout(1200);
  await tap(page, 195, 814, 2000);
  await pick(page, 195, 126, 'post.jpg');
  await tap(page, 195, 290, 600);
  await type(page, 'Hello from Pulso! Our community app is up and running.', 45);
  await snap(page, 'post-filled');
  await tap(page, 195, 433, 4500);
  await snap(page, 'after-post');

  chapter('Open the post', 'My profile counts the new post; tapping it opens the post with its comments.');
  await page.waitForTimeout(2000);
  await tap(page, 65, 385, 3000);
  await snap(page, 'detail');

  chapter('Like and comment', 'Likes and comments are saved to the database and update on every open screen in real time.');
  await page.waitForTimeout(1200);
  const save = (await find(page, /^Save$/)).sort((a, b) => a.y - b.y)[0];
  const row = save?.y ?? 690;
  await tap(page, 36, row, 1800);
  await snap(page, 'liked');
  const box = (await find(page, /Add a comment/))[0];
  await tap(page, box?.x ?? 170, box?.y ?? 800, 700);
  await type(page, 'First post on the app we built!', 55);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  await snap(page, 'commented');

  log('end');
  await page.waitForTimeout(300);
  await cdp.send('Page.stopScreencast');
  await page.waitForTimeout(300);
  writeFileSync(`${OUT}/frames.json`, JSON.stringify(frames));
  writeFileSync(`${OUT}/events.json`, JSON.stringify(events, null, 1));
  console.log('frames', frames.length);
});
