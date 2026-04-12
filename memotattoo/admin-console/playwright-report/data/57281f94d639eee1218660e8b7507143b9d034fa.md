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
          - paragraph [ref=e56]: Brainstorm topics, generate study flashcards, and detailed illustrations using Gemini.
        - button "Trash Deck Draft" [ref=e57] [cursor=pointer]
      - generic [ref=e59]:
        - generic [ref=e60] [cursor=pointer]:
          - generic [ref=e61]: "1"
          - generic [ref=e62]: Topic
        - generic [ref=e64] [cursor=pointer]:
          - generic [ref=e65]: "2"
          - generic [ref=e66]: Content
        - generic [ref=e68] [cursor=pointer]:
          - generic [ref=e69]: "3"
          - generic [ref=e70]: Images
      - generic [ref=e72]:
        - generic [ref=e73]:
          - generic [ref=e74]:
            - heading "2. Edit Content Payload" [level=3] [ref=e75]
            - paragraph [ref=e76]: Review and refine the generated concepts.
          - generic [ref=e77]:
            - button "Visual" [ref=e78] [cursor=pointer]
            - button "JSON" [ref=e79] [cursor=pointer]
        - generic [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]: Deck Title
            - textbox [ref=e83]: Test Topic Fundamentals
          - generic [ref=e84]:
            - generic [ref=e85]:
              - generic [ref=e86]:
                - generic [ref=e87]: Concept 1
                - button "Remove Concept" [ref=e88] [cursor=pointer]:
                  - img [ref=e89]
              - textbox "Term" [ref=e91]: Core Hypothesis
              - textbox "Definition" [ref=e92]: The foundational assumption or primary question that drives the entire test topic.
            - generic [ref=e93]:
              - generic [ref=e94]:
                - generic [ref=e95]: Concept 2
                - button "Remove Concept" [ref=e96] [cursor=pointer]:
                  - img [ref=e97]
              - textbox "Term" [ref=e99]: Variable Analysis
              - textbox "Definition" [ref=e100]: The process of identifying and isolating specific factors that influence the outcome of the test.
            - generic [ref=e101]:
              - generic [ref=e102]:
                - generic [ref=e103]: Concept 3
                - button "Remove Concept" [ref=e104] [cursor=pointer]:
                  - img [ref=e105]
              - textbox "Term" [ref=e107]: Control Group
              - textbox "Definition" [ref=e108]: A standard baseline used for comparison to ensure the results are accurate and unbiased.
            - generic [ref=e109]:
              - generic [ref=e110]:
                - generic [ref=e111]: Concept 4
                - button "Remove Concept" [ref=e112] [cursor=pointer]:
                  - img [ref=e113]
              - textbox "Term" [ref=e115]: Data Collection
              - textbox "Definition" [ref=e116]: The systematic gathering of observations and metrics during the testing process.
            - generic [ref=e117]:
              - generic [ref=e118]:
                - generic [ref=e119]: Concept 5
                - button "Remove Concept" [ref=e120] [cursor=pointer]:
                  - img [ref=e121]
              - textbox "Term" [ref=e123]: Conclusion Synthesis
              - textbox "Definition" [ref=e124]: The final step of interpreting the collected data to validate or refute the initial hypothesis.
          - button "Brainstorm 3 More Items" [ref=e126] [cursor=pointer]:
            - img [ref=e127]
            - text: Brainstorm 3 More Items
        - generic [ref=e129]:
          - generic [ref=e130]: Global Art Direction (Optional)
          - generic [ref=e131]:
            - textbox "e.g. 90s Anime Style, Vector Art, Pastel Colors..." [ref=e132]
            - generic [ref=e135] [cursor=pointer]:
              - img [ref=e136]
              - text: Upload Reference Image
        - generic [ref=e138]:
          - button "Back" [ref=e139] [cursor=pointer]
          - 'button "Next: Generate Images" [ref=e140] [cursor=pointer]'
      - generic [ref=e142]:
        - img [ref=e143]
        - generic [ref=e145]: Topic breakdown generated successfully!
        - button [ref=e146] [cursor=pointer]:
          - img [ref=e147]
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
  100 |   test('Journey 10: Flashcard Studio Steps Assistant Flow', async ({ page }) => {
  101 |     await page.goto('/flashcard-studio');
  102 |     
  103 |     // Step 1: Topic Form
  104 |     await expect(page.locator('h3:has-text("1. Break Down Topic")')).toBeVisible();
  105 |     
  106 |     const topicInput = page.locator('input[formControlName="topic"]').first();
  107 |     await topicInput.fill('Test Topic');
  108 |     
  109 |     // Mock AI response
  110 |     await page.route('**/models/gemini-*:generateContent', async route => {
  111 |       await route.fulfill({
  112 |         status: 200,
  113 |         contentType: 'application/json',
  114 |         body: JSON.stringify({
  115 |           candidates: [{
  116 |             content: {
  117 |               parts: [{
  118 |                 text: JSON.stringify({
  119 |                   title: "Test Topic Deck",
  120 |                   items: [
  121 |                     { term: "Concept 1", definition: "Definition 1" },
  122 |                     { term: "Concept 2", definition: "Definition 2" }
  123 |                   ]
  124 |                 })
  125 |               }]
  126 |             }
  127 |           }]
  128 |         })
  129 |       });
  130 |     });
  131 |     
  132 |     const brainstormButton = page.locator('button:has-text("Brainstorm Content")').first();
  133 |     await brainstormButton.click();
  134 |     
  135 |     // Should move to Step 2
  136 |     await expect(page.locator('h3:has-text("2. Edit Content Payload")')).toBeVisible();
  137 |     
  138 |     // Click Next to go to Step 3
  139 |     const nextButton = page.locator('button:has-text("Next: Generate Images")').first();
  140 |     await nextButton.click();
  141 |     
  142 |     // Should move to Step 3
  143 |     await expect(page.locator('h3:has-text("3. Per-Concept Image Generation")')).toBeVisible();
  144 |   });
  145 | 
  146 | });
  147 | 
```