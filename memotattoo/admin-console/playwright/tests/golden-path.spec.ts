import { test, expect } from '@playwright/test';

test.describe('Admin Console Golden Path - All User Journeys', () => {

  // Run this before EVERY test so that Firebase's IndexedDB has the token available natively for that browser instance!
  test.beforeEach(async ({ page }) => {
    const email = process.env['E2E_EMAIL'] || 'admin@memotattoo.com';
    const password = process.env['E2E_PASSWORD'] || 'memotattoo123';

    await page.goto('/auth');
    await page.locator('input[name="email"], input[type="email"]').fill(email);
    await page.locator('input[name="password"], input[type="password"]').fill(password);
    
    // Specifically target the submit button
    await page.locator('button[type="submit"]').click();
    
    // Ensure we land on the dashboard natively
    await page.waitForURL('**/', { timeout: 10000 });
  });

  test('Journey 1: Load Dashboard Securely', async ({ page }) => {
    // Check that we are on the dashboard
    await expect(page).toHaveURL(/.*\/$/); // Ends with /
    
    // Check for a heading
    const heading = page.locator('h1, h2, .dashboard-title').first();
    await expect(heading).toBeVisible();
  });

  test('Journey 2: Flashcard Studio Generation Form', async ({ page }) => {
    await page.goto('/flashcard-studio');
    
    // Verify navigation
    await expect(page).toHaveURL(/.*flashcard-studio/);
  });

  test('Journey 3: Flashcard Library Viewing', async ({ page }) => {
    await page.goto('/flashcard-library');
    await expect(page).toHaveURL(/.*flashcard-library/);
  });

  test('Journey 4: Deck Moderation', async ({ page }) => {
    await page.goto('/deck-moderation');
    await expect(page).toHaveURL(/.*deck-moderation/);
    
    // Verify a core element loads rather than networkidle due to Firebase websockets
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('Journey 5: System Logs Observation', async ({ page }) => {
    await page.goto('/logs');
    await expect(page).toHaveURL(/.*logs/);
  });

  test('Journey 6: User Management', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/.*users/);
  });

  test('Journey 7: Game Simulation Environment', async ({ page }) => {
    await page.goto('/game');
    await expect(page).toHaveURL(/.*game/);
  });

  test('Journey 8: Unauthorized / Fallback Route Redirect', async ({ page }) => {
    // Navigating to a completely random non-existent route
    await page.goto('/this-route-does-not-exist');
    
    // Angular router `**` path should catch and redirect to `/` natively
    await expect(page).toHaveURL(/.*\/$/);
  });

});
