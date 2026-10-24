import type { Page } from '@playwright/test';

// Finds controls in a Flutter web app by their accessibility label, so a
// recording taps "Publish deal" wherever it is on screen instead of at a fixed
// position that breaks when a list scrolls a little further.

export type Node = { text: string; x: number; y: number; w: number; h: number };

export async function enableLabels(page: Page) {
  await page.evaluate(() => (document.querySelector('flt-semantics-placeholder') as HTMLElement | null)?.click());
  await page.waitForTimeout(600);
}

export async function nodes(page: Page): Promise<Node[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('flt-semantics, input, textarea'))
      .map((e) => {
        const r = e.getBoundingClientRect();
        const text = (
          e.getAttribute('aria-label') ||
          (e as HTMLInputElement).placeholder ||
          (e.tagName.startsWith('FLT') ? (e as HTMLElement).innerText : '') ||
          ''
        ).trim();
        return { text, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
      })
      .filter((n) => n.text && n.w > 0 && n.h > 0),
  );
}

/** Every visible control whose label matches, top to bottom. */
export async function findAll(page: Page, match: string | RegExp) {
  const all = await nodes(page);
  // A card's label lists all its text, one line per item; match its first
  // line (its title), so a screen-sized container never matches.
  const first = (t: string) => t.split('\n')[0].trim();
  const hit = (t: string) => (typeof match === 'string' ? first(t) === match : match.test(first(t)));
  const found = all.filter((n) => hit(n.text)).sort((a, b) => a.w * a.h - b.w * b.h);
  const unique = found.filter((n, i) => found.findIndex((m) => Math.abs(m.x - n.x) < 4 && Math.abs(m.y - n.y) < 4) === i);
  return unique.sort((a, b) => a.y - b.y);
}
