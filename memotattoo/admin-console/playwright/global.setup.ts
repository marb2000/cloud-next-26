import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const { baseURL, storageState } = config.projects[0].use;
  const authFile = storageState as string;

  // Make sure the directory for storage state exists
  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Define credentials. In CI, these should come from process.env
  const email = process.env['E2E_EMAIL'] || 'admin@memotattoo.com';
  const password = process.env['E2E_PASSWORD'] || 'memotattoo123';

  console.log(`E2E Global Setup: Authenticating as ${email}...`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto(`${baseURL}/auth`);

  // Fill in login credentials (update selectors if needed based on your real UI)
  await page.locator('input[name="email"], input[type="email"]').fill(email);
  await page.locator('input[name="password"], input[type="password"]').fill(password);
  
  // Submit the login form
  await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').click();

  // Wait for login to complete by expecting navigation to dashboard ('/')
  // We use `waitForURL` to make sure Firebase authentication completes and Angular routing proceeds
  await page.waitForURL('**/', { timeout: 10000 });

  // Save storage state into the file so subsequent tests avoid logging in
  await page.context().storageState({ path: authFile });
  await browser.close();
  
  console.log('E2E Global Setup: Auth state saved.');
}

export default globalSetup;
