import { test } from '@playwright/test';

// Opens the app in a visible window so I can sign in myself, then saves the
// signed-in browser state to PULSO_STATE for record.spec.ts. Run with --headed.

test('sign in to Pulso', async ({ page }) => {
  test.setTimeout(900_000);
  await page.goto('/');
  // Supabase keeps the session in localStorage once sign-in succeeds.
  await page.waitForFunction(
    () => Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token')),
    undefined,
    { timeout: 880_000, polling: 1000 },
  );
  await page.waitForTimeout(3000);
  await page.context().storageState({ path: process.env['PULSO_STATE']! });
  console.log('signed in; state saved');
});
