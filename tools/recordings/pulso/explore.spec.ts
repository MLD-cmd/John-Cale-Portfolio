import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Read-only look around the signed-in app before writing record.spec.ts:
// a screenshot and the accessibility labels of each screen it visits. It opens
// forms and menus but never submits them. Output goes to PULSO_EXPLORE.

const OUT = process.env['PULSO_EXPLORE'] ?? import.meta.dirname + '/explore';
test.use({ storageState: process.env['PULSO_STATE'] });

async function labels(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('flt-semantics')).map((e) => {
      const r = e.getBoundingClientRect();
      const text = (e.getAttribute('aria-label') || (e as HTMLElement).innerText || '').trim().replace(/\s+/g, ' ');
      return text && r.width < 390 ? `${Math.round(r.x + r.width / 2)},${Math.round(r.y + r.height / 2)} ${Math.round(r.width)}x${Math.round(r.height)} ${e.getAttribute('role') ?? ''} ${text.slice(0, 80)}` : '';
    }).filter(Boolean),
  );
}

test('explore Pulso', async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  const dump: string[] = [];
  const look = async (name: string) => {
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${name}.png` });
    dump.push(`== ${name}`, ...new Set(await labels(page)));
  };
  const tap = (x: number, y: number) => page.mouse.click(x, y);
  const home = async () => {
    await page.goto('/');
    await page.waitForTimeout(6000);
    await page.evaluate(() => (document.querySelector('flt-semantics-placeholder') as HTMLElement | null)?.click());
    await page.waitForTimeout(1200);
  };

  await home();
  await tap(195, 814); await look('new-post');
  await home();
  await tap(45, 145); await look('story-tap');
  await home();
  await tap(358, 239); await look('post-menu');
  await home();
  await page.mouse.move(195, 500); await page.mouse.wheel(0, 500); await look('feed-scrolled');
  await home();
  await tap(351, 814); await look('profile');
  await tap(195, 221); await look('edit-profile');
  await home();
  await tap(195, 814); await page.waitForTimeout(1500);
  let chooser = page.waitForEvent('filechooser');
  await tap(195, 126);
  await (await chooser).setFiles(import.meta.dirname + '/media/post.jpg');
  await look('new-post-photo');
  await home();
  await tap(45, 145); await page.waitForTimeout(1500);
  chooser = page.waitForEvent('filechooser');
  await tap(195, 172);
  await (await chooser).setFiles(import.meta.dirname + '/media/story.jpg');
  await look('new-story-photo');
  await home();
  await page.mouse.move(195, 500); await page.mouse.wheel(0, 250); await page.waitForTimeout(1500);
  await look('feed-250');
  writeFileSync(`${OUT}/labels.txt`, dump.join('\n'));
});
