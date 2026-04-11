# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: golden-path.spec.ts >> Admin Console Golden Path - All User Journeys >> Journey 9: Insufficient Energy Bolts Error Handling
- Location: playwright/tests/golden-path.spec.ts:66:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.toast-error, .toast:has-text("You don\'t have enough energy bolts")').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.toast-error, .toast:has-text("You don\'t have enough energy bolts")').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - img "MemoTattoo" [ref=e6]
      - generic [ref=e7]: MemoTattoo
    - generic [ref=e8]:
      - link "Dashboard" [ref=e9] [cursor=pointer]:
        - /url: /
        - img [ref=e10]
        - generic [ref=e12]: Dashboard
      - link "Deck Studio" [ref=e13] [cursor=pointer]:
        - /url: /flashcard-studio
        - img [ref=e14]
        - generic [ref=e16]: Deck Studio
      - link "Deck Library" [ref=e17] [cursor=pointer]:
        - /url: /flashcard-library
        - img [ref=e18]
        - generic [ref=e20]: Deck Library
      - link "Game Simulation" [ref=e21] [cursor=pointer]:
        - /url: /game
        - img [ref=e22]
        - generic [ref=e25]: Game Simulation
      - link "Moderation Queue" [ref=e26] [cursor=pointer]:
        - /url: /deck-moderation
        - img [ref=e27]
        - generic [ref=e29]: Moderation Queue
      - link "User Management" [ref=e30] [cursor=pointer]:
        - /url: /users
        - img [ref=e31]
        - generic [ref=e33]: User Management
      - link "Activity Logs" [ref=e34] [cursor=pointer]:
        - /url: /logs
        - img [ref=e35]
        - generic [ref=e37]: Activity Logs
    - generic [ref=e38]:
      - generic [ref=e39]:
        - generic [ref=e40]:
          - paragraph [ref=e41]: Connected
          - paragraph [ref=e42]: admin@memotattoo.com
        - button "Sign Out" [ref=e43] [cursor=pointer]:
          - img [ref=e44]
          - generic [ref=e46]: Sign Out
      - button "Toggle Sidebar" [ref=e47] [cursor=pointer]:
        - img [ref=e48]
  - main [ref=e50]:
    - generic [ref=e52]:
      - generic [ref=e53]:
        - generic [ref=e54]:
          - heading "Flashcard Deck Studio" [level=1] [ref=e55]
          - paragraph [ref=e56]: Generate curriculum, topic concepts, and detailed illustrations using Gemini AI.
        - button "Trash Deck Draft" [ref=e57] [cursor=pointer]
      - generic [ref=e58]:
        - generic [ref=e59]:
          - generic [ref=e60]:
            - heading "1. Break Down Topic" [level=3] [ref=e61]
            - generic [ref=e62]:
              - generic [ref=e63]:
                - generic [ref=e64]: Subject
                - textbox "e.g., Newton's Laws" [ref=e65]: Test Topic
              - generic [ref=e66]:
                - generic [ref=e67]: Items
                - spinbutton [ref=e68]: "5"
            - button "Brainstorm Content" [ref=e69] [cursor=pointer]
          - generic [ref=e70]:
            - generic [ref=e71]:
              - heading "2. Edit Content Payload" [level=3] [ref=e72]
              - generic [ref=e73]:
                - button "Visual" [ref=e74] [cursor=pointer]
                - button "JSON" [ref=e75] [cursor=pointer]
            - generic [ref=e76]:
              - generic [ref=e77]:
                - generic [ref=e78]: Deck Title
                - textbox [ref=e79]: Test Topic Fundamentals
              - generic [ref=e80]:
                - generic [ref=e81]:
                  - generic [ref=e82]:
                    - generic [ref=e83]: Concept 1
                    - button "Remove Concept" [ref=e84] [cursor=pointer]:
                      - img [ref=e85]
                  - textbox "Term" [ref=e87]: Core Hypothesis
                  - textbox "Definition" [ref=e88]: The foundational assumption that sets the stage for the entire test topic.
                - generic [ref=e89]:
                  - generic [ref=e90]:
                    - generic [ref=e91]: Concept 2
                    - button "Remove Concept" [ref=e92] [cursor=pointer]:
                      - img [ref=e93]
                  - textbox "Term" [ref=e95]: Variable Analysis
                  - textbox "Definition" [ref=e96]: Identifying the specific elements that change or remain constant during the evaluation.
                - generic [ref=e97]:
                  - generic [ref=e98]:
                    - generic [ref=e99]: Concept 3
                    - button "Remove Concept" [ref=e100] [cursor=pointer]:
                      - img [ref=e101]
                  - textbox "Term" [ref=e103]: Data Collection
                  - textbox "Definition" [ref=e104]: The systematic process of gathering evidence to support or refute the core hypothesis.
                - generic [ref=e105]:
                  - generic [ref=e106]:
                    - generic [ref=e107]: Concept 4
                    - button "Remove Concept" [ref=e108] [cursor=pointer]:
                      - img [ref=e109]
                  - textbox "Term" [ref=e111]: Pattern Recognition
                  - textbox "Definition" [ref=e112]: Identifying recurring trends or anomalies within the collected data set.
                - generic [ref=e113]:
                  - generic [ref=e114]:
                    - generic [ref=e115]: Concept 5
                    - button "Remove Concept" [ref=e116] [cursor=pointer]:
                      - img [ref=e117]
                  - textbox "Term" [ref=e119]: Final Synthesis
                  - textbox "Definition" [ref=e120]: Drawing a logical conclusion based on the evidence and patterns observed.
              - button "Brainstorm 3 More Items" [ref=e122] [cursor=pointer]:
                - img [ref=e123]
                - text: Brainstorm 3 More Items
            - generic [ref=e125]:
              - generic [ref=e126]: Global Art Direction (Optional)
              - generic [ref=e127]:
                - textbox "e.g. 90s Anime Style, Vector Art, Pastel Colors..." [ref=e128]
                - generic [ref=e131] [cursor=pointer]:
                  - img [ref=e132]
                  - text: Upload Reference Image
        - generic [ref=e134]:
          - generic [ref=e135]:
            - heading "3. Per-Concept Image Generation" [level=3] [ref=e136]
            - button "Generate Missing Images" [ref=e137] [cursor=pointer]
          - generic [ref=e138]:
            - generic [ref=e139]:
              - heading "Core Hypothesis" [level=4] [ref=e140]
              - paragraph [ref=e141]: The foundational assumption that sets the stage for the entire test topic.
              - generic [ref=e143]: No image generated yet.
              - generic [ref=e144]:
                - button "Generate Concept Image" [ref=e145] [cursor=pointer]
                - generic "Upload Custom Image" [ref=e146] [cursor=pointer]:
                  - img [ref=e147]
            - generic [ref=e149]:
              - heading "Variable Analysis" [level=4] [ref=e150]
              - paragraph [ref=e151]: Identifying the specific elements that change or remain constant during the evaluation.
              - generic [ref=e153]: No image generated yet.
              - generic [ref=e154]:
                - button "Generate Concept Image" [ref=e155] [cursor=pointer]
                - generic "Upload Custom Image" [ref=e156] [cursor=pointer]:
                  - img [ref=e157]
            - generic [ref=e159]:
              - heading "Data Collection" [level=4] [ref=e160]
              - paragraph [ref=e161]: The systematic process of gathering evidence to support or refute the core hypothesis.
              - generic [ref=e163]: No image generated yet.
              - generic [ref=e164]:
                - button "Generate Concept Image" [ref=e165] [cursor=pointer]
                - generic "Upload Custom Image" [ref=e166] [cursor=pointer]:
                  - img [ref=e167]
            - generic [ref=e169]:
              - heading "Pattern Recognition" [level=4] [ref=e170]
              - paragraph [ref=e171]: Identifying recurring trends or anomalies within the collected data set.
              - generic [ref=e173]: No image generated yet.
              - generic [ref=e174]:
                - button "Generate Concept Image" [ref=e175] [cursor=pointer]
                - generic "Upload Custom Image" [ref=e176] [cursor=pointer]:
                  - img [ref=e177]
            - generic [ref=e179]:
              - heading "Final Synthesis" [level=4] [ref=e180]
              - paragraph [ref=e181]: Drawing a logical conclusion based on the evidence and patterns observed.
              - generic [ref=e183]: No image generated yet.
              - generic [ref=e184]:
                - button "Generate Concept Image" [ref=e185] [cursor=pointer]
                - generic "Upload Custom Image" [ref=e186] [cursor=pointer]:
                  - img [ref=e187]
          - button "Submit for Public Moderation" [disabled] [ref=e190]
      - generic [ref=e192]:
        - img [ref=e193]
        - generic [ref=e195]: Topic breakdown generated successfully!
        - button [ref=e196] [cursor=pointer]:
          - img [ref=e197]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Admin Console Golden Path - All User Journeys', () => {
  4   | 
  5   |   // Run this before EVERY test so that Firebase's IndexedDB has the token available natively for that browser instance!
  6   |   test.beforeEach(async ({ page }) => {
  7   |     const email = process.env['E2E_EMAIL'] || 'admin@memotattoo.com';
  8   |     const password = process.env['E2E_PASSWORD'] || 'memotattoo123';
  9   | 
  10  |     await page.goto('/auth');
  11  |     await page.locator('input[name="email"], input[type="email"]').fill(email);
  12  |     await page.locator('input[name="password"], input[type="password"]').fill(password);
  13  |     
  14  |     // Specifically target the submit button
  15  |     await page.locator('button[type="submit"]').click();
  16  |     
  17  |     // Ensure we land on the dashboard natively
  18  |     await page.waitForURL('**/', { timeout: 10000 });
  19  |   });
  20  | 
  21  |   test('Journey 1: Load Dashboard Securely', async ({ page }) => {
  22  |     // Check that we are on the dashboard
  23  |     await expect(page).toHaveURL(/.*\/$/); // Ends with /
  24  |     
  25  |     // Check for a heading
  26  |     const heading = page.locator('h1, h2, .dashboard-title').first();
  27  |     await expect(heading).toBeVisible();
  28  |   });
  29  | 
  30  |   test('Journey 2: Flashcard Studio Generation Form', async ({ page }) => {
  31  |     await page.goto('/flashcard-studio');
  32  |     
  33  |     // Verify navigation
  34  |     await expect(page).toHaveURL(/.*flashcard-studio/);
  35  |   });
  36  | 
  37  |   test('Journey 3: Flashcard Library Viewing', async ({ page }) => {
  38  |     await page.goto('/flashcard-library');
  39  |     await expect(page).toHaveURL(/.*flashcard-library/);
  40  |   });
  41  | 
  42  |   test('Journey 4: Deck Moderation', async ({ page }) => {
  43  |     await page.goto('/deck-moderation');
  44  |     await expect(page).toHaveURL(/.*deck-moderation/);
  45  |     
  46  |     // Verify a core element loads rather than networkidle due to Firebase websockets
  47  |     const heading = page.locator('h1, h2').first();
  48  |     await expect(heading).toBeVisible();
  49  |   });
  50  | 
  51  |   test('Journey 5: System Logs Observation', async ({ page }) => {
  52  |     await page.goto('/logs');
  53  |     await expect(page).toHaveURL(/.*logs/);
  54  |   });
  55  | 
  56  |   test('Journey 6: User Management', async ({ page }) => {
  57  |     await page.goto('/users');
  58  |     await expect(page).toHaveURL(/.*users/);
  59  |   });
  60  | 
  61  |   test('Journey 7: Game Simulation Environment', async ({ page }) => {
  62  |     await page.goto('/game');
  63  |     await expect(page).toHaveURL(/.*game/);
  64  |   });
  65  | 
  66  |   test('Journey 9: Insufficient Energy Bolts Error Handling', async ({ page }) => {
  67  |     await page.goto('/flashcard-studio');
  68  |     
  69  |     await page.route('**/models/gemini-*:generateContent', async route => {
  70  |       await route.fulfill({
  71  |         status: 400,
  72  |         contentType: 'application/json',
  73  |         body: JSON.stringify({
  74  |           error: {
  75  |             message: "Insufficient energy bolts",
  76  |             status: "FAILED_PRECONDITION"
  77  |           }
  78  |         })
  79  |       });
  80  |     });
  81  | 
  82  |     const topicInput = page.locator('input[formControlName="topic"]').first();
  83  |     await topicInput.fill('Test Topic');
  84  |     
  85  |     const brainstormButton = page.locator('button:has-text("Brainstorm"), button:has-text("Generate")').first();
  86  |     await brainstormButton.click();
  87  |     
  88  |     const toast = page.locator('.toast-error, .toast:has-text("You don\'t have enough energy bolts")').first();
> 89  |     await expect(toast).toBeVisible();
      |                         ^ Error: expect(locator).toBeVisible() failed
  90  |   });
  91  | 
  92  |   test('Journey 8: Unauthorized / Fallback Route Redirect', async ({ page }) => {
  93  |     // Navigating to a completely random non-existent route
  94  |     await page.goto('/this-route-does-not-exist');
  95  |     
  96  |     // Angular router `**` path should catch and redirect to `/` natively
  97  |     await expect(page).toHaveURL(/.*\/$/);
  98  |   });
  99  | 
  100 | });
  101 | 
```