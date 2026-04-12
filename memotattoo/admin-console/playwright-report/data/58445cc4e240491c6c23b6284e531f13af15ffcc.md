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
          - generic [ref=e70]: Style
        - generic [ref=e72] [cursor=pointer]:
          - generic [ref=e73]: "4"
          - generic [ref=e74]: Images
      - generic [ref=e76]:
        - generic [ref=e77]:
          - generic [ref=e78]:
            - heading "2. Edit Content Payload" [level=3] [ref=e79]
            - paragraph [ref=e80]: Review and refine the generated concepts.
          - generic [ref=e81]:
            - button "Visual" [ref=e82] [cursor=pointer]
            - button "JSON" [ref=e83] [cursor=pointer]
        - generic [ref=e84]:
          - generic [ref=e85]:
            - generic [ref=e86]: Deck Title
            - textbox [ref=e87]: Test Topic Fundamentals
          - generic [ref=e88]:
            - generic [ref=e89]:
              - generic [ref=e90]:
                - generic [ref=e91]: Concept 1
                - button "Remove Concept" [ref=e92] [cursor=pointer]:
                  - img [ref=e93]
              - textbox "Term" [ref=e95]: Core Concept
              - textbox "Definition" [ref=e96]: The primary idea that serves as the foundation for the entire topic.
            - generic [ref=e97]:
              - generic [ref=e98]:
                - generic [ref=e99]: Concept 2
                - button "Remove Concept" [ref=e100] [cursor=pointer]:
                  - img [ref=e101]
              - textbox "Term" [ref=e103]: Supporting Data
              - textbox "Definition" [ref=e104]: The essential facts and evidence that validate the core concept.
            - generic [ref=e105]:
              - generic [ref=e106]:
                - generic [ref=e107]: Concept 3
                - button "Remove Concept" [ref=e108] [cursor=pointer]:
                  - img [ref=e109]
              - textbox "Term" [ref=e111]: Methodology
              - textbox "Definition" [ref=e112]: The systematic approach used to analyze and apply the topic's principles.
            - generic [ref=e113]:
              - generic [ref=e114]:
                - generic [ref=e115]: Concept 4
                - button "Remove Concept" [ref=e116] [cursor=pointer]:
                  - img [ref=e117]
              - textbox "Term" [ref=e119]: Practical Application
              - textbox "Definition" [ref=e120]: Real-world scenarios where the topic is utilized to solve specific problems.
            - generic [ref=e121]:
              - generic [ref=e122]:
                - generic [ref=e123]: Concept 5
                - button "Remove Concept" [ref=e124] [cursor=pointer]:
                  - img [ref=e125]
              - textbox "Term" [ref=e127]: Future Implications
              - textbox "Definition" [ref=e128]: The long-term impact and potential evolution of the topic in the field.
          - button "Brainstorm 3 More Items" [ref=e130] [cursor=pointer]:
            - img [ref=e131]
            - text: Brainstorm 3 More Items
        - generic [ref=e133]:
          - button "Back" [ref=e134] [cursor=pointer]
          - 'button "Next: Art Direction" [ref=e135] [cursor=pointer]'
      - generic [ref=e137]:
        - img [ref=e138]
        - generic [ref=e140]: Topic breakdown generated successfully!
        - button [ref=e141] [cursor=pointer]:
          - img [ref=e142]
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
  138 |     // Click Next to go to Step 3 (Art Direction)
  139 |     const nextButton = page.locator('button:has-text("Next: Art Direction")').first();
  140 |     await nextButton.click();
  141 |     
  142 |     // Should move to Step 3
  143 |     await expect(page.locator('h3:has-text("3. Global Art Direction")')).toBeVisible();
  144 | 
  145 |     // Click Next to go to Step 4 (Images)
  146 |     const nextButton2 = page.locator('button:has-text("Next: Generate Images")').first();
  147 |     await nextButton2.click();
  148 |     
  149 |     // Should move to Step 4
  150 |     await expect(page.locator('h3:has-text("4. Per-Concept Image Generation")')).toBeVisible();
  151 |   });
  152 | 
  153 | });
  154 | 
```