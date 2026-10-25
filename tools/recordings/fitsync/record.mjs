import { chromium, devices } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Screen recording of the FitSync Figma prototype, played in the Figma
// viewer (public link). The prototype is a design, not a built app: every tap
// below is one of its prototype links, found by tapping a blank area (Figma
// then outlines each link). Taps, captions and timings are logged so the video
// can draw the touches. Run: node record.mjs   (needs playwright)

const FILE = 'jcp04A19r5D7r49CBZZpa7/FitSync-by-Nombrado';
const BASE = `https://www.figma.com/proto/${FILE}?page-id=0%3A1&scaling=scale-down&hide-ui=1`;
const START = `${BASE}&node-id=2-9&starting-point-node-id=392%3A105`;
const W = 393, H = 852;
const OUT = process.env.OUT || new URL('./recording', import.meta.url).pathname;
let dbg = 0;
const events = [];
const now = () => Date.now() / 1000;
const log = (type, extra = {}) => events.push({ type, t: now(), ...extra });
const chapter = (title, text) => log('chapter', { title, text });

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/frames`, { recursive: true });

const browser = await chromium.launch({ channel: 'chromium', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ ...devices['iPhone 14 Pro'], viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const node = () => new URL(page.url()).searchParams.get('node-id');
const wait = (ms) => page.waitForTimeout(ms);

// Open once to dismiss the cookie banner, then reload and let it settle on the log-in screen.
await page.goto(START); await wait(5000);
const optout = page.getByText('Opt out');
if (await optout.count()) await optout.first().click().catch(() => {});
await wait(500);
await page.goto(START);
await wait(7000);      // splash plays, then the log-in screen is up before recording starts

async function tap(x, y, settle = 1700, expect) {
  log('tap', { x, y });
  await page.touchscreen.tap(x, y);
  await wait(settle);
  if (process.env.DEBUG) { console.log("tap", x, y, "->", node()); await page.screenshot({ path: `${OUT}/dbg-${String(dbg++).padStart(2, "0")}-${x}-${y}.png`, scale: "css" }); }
  if (expect && node() !== expect) console.log(`WARN tap ${x},${y}: wanted ${expect}, at ${node()}`);
}
async function swipeUp(x, y, dy, ms = 500) {
  const started = now();
  const steps = 20;
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await wait(ms / steps); }
  events.push({ type: 'swipe', t: started, from: { x, y: y + dy / 4 }, to: { x, y: y - dy / 4 }, ms: now() - started });
  await wait(500);
}
const BACK = [38, 62];

const cdp = await ctx.newCDPSession(page);
const frames = [];
let n = 0, last = '';
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const h = createHash('md5').update(data).digest('hex');
  if (h !== last) {
    last = h;
    const file = `f${String(n++).padStart(5, '0')}.jpg`;
    writeFileSync(`${OUT}/frames/${file}`, Buffer.from(data, 'base64'));
    frames.push({ t: metadata.timestamp ?? now(), file });
  }
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W * 2, maxHeight: H * 2, everyNthFrame: 1 });
log('start');

chapter('Log in', 'The prototype opens on the FIT SYNC log-in screen: email and password, or Facebook and Gmail.');
await wait(2200);

chapter('Create an account', 'New users sign up with a username, email, and password, then reach a welcome screen.');
await tap(198, 766, 2400, '6-24');    // sign-up link
await wait(1800);
await tap(196, 494, 2600, '85-5');    // Sign up
await wait(1200);
await tap(196, 528, 2400, '11-103');  // Proceed

chapter('Home dashboard', "Home shows today's finished and in-progress workouts, time spent, vitals, and daily activity goals.");
await wait(2200);
await tap(335, 93, 2400);             // bell
await wait(1200);
await tap(336, 123, 1200);           // close the notice
await wait(1500);

chapter('Daily calendar', 'The calendar lists past workouts in a history, opened with one tap.');
await tap(51, 819, 2200, '16-19');
await tap(196, 498, 2000);            // history toggle
await wait(1400);
await tap(...BACK, 1800);

chapter('Pick a workout', 'The workouts tab lists exercise categories and videos, with a search bar for exercises.');
await tap(123, 819, 2200, '62-92');
await tap(196, 514, 1700);            // search
await wait(1500);
await tap(...BACK, 1500);
if (node() !== '62-92') await tap(123, 819, 2200, '62-92');

chapter('Set up the exercise', "Each category has a set-up screen: choose the day and add exercises with the plus buttons.");
await tap(165, 165, 2400, '339-384'); // cardio
await wait(1200);
await tap(...BACK, 1700, '62-92');
await tap(225, 165, 2400, '144-470'); // push
await wait(1200);
await tap(...BACK, 1700, '62-92');
await tap(285, 165, 2400, '144-471'); // strength
await wait(1200);
await tap(...BACK, 1700, '62-92');
await tap(...BACK, 1800, '11-103');

chapter('Track progress', 'The stats tab shows a weekly overview, then one progress ring and chart for each workout type.');
await tap(260, 819, 2400, '183-195');
await wait(1400);
await tap(45, 806, 2200, '149-65');   // cardio
await tap(...BACK, 1600);
await tap(135, 806, 2200, '183-131'); // pull
await tap(...BACK, 1600);
await tap(236, 806, 2200, "183-100"); // push
await tap(...BACK, 1600);
await tap(342, 806, 2200, "183-162"); // strength
await tap(...BACK, 1600);
await tap(...BACK, 1800, '11-103');

chapter('Plan meals', 'The meals tab shows a water reminder and a card for each meal. Each opens its ingredients, prep time, and calories.');
await tap(330, 819, 2400, '149-66');
await wait(1200);
await tap(294, 330, 2400, '333-285'); // lunch
await swipeUp(196, 600, 300);
await wait(1400);
await tap(...BACK, 1700, '149-66');
await tap(98, 330, 2400, '333-98');   // breakfast
await swipeUp(196, 600, 300);
await wait(1400);
await tap(...BACK, 1700, '149-66');

chapter('Track protein', 'Expanding a meal card shows its nutritional values, and a bar chart tracks protein intake over the past few days.');
await tap(98, 498, 1800);             // expand breakfast
await tap(294, 498, 1800);            // expand lunch
await swipeUp(196, 600, 360);
await wait(1800);
await swipeUp(196, 400, -360);
await tap(...BACK, 1800, '11-103');

chapter('Profile and settings', 'The settings tab opens the profile, where an edit form changes the username, email, phone number, and password.');
await tap(190, 819, 2400, '348-779');
await wait(1400);
await tap(196, 246, 2400, '476-127'); // edit profile
await wait(2200);
await tap(...BACK, 1800, '11-103');
await tap(190, 819, 2200, '348-779');
await wait(800);

chapter('Log out and sign in', 'Log out returns to the log-in screen, where Facebook and Gmail sign-in open their own forms.');
await tap(198, 662, 2400, '2-9');     // log out
await wait(1400);
await tap(154, 650, 2400, '35-150');  // Facebook
await wait(1600);
await tap(196, 434, 2400, '11-103');  // Log in
await wait(2000);
log('end');
await wait(300);
await cdp.send('Page.stopScreencast');
await wait(300);
writeFileSync(`${OUT}/frames.json`, JSON.stringify(frames));
writeFileSync(`${OUT}/events.json`, JSON.stringify(events, null, 1));
console.log('frames', frames.length);
await browser.close();
