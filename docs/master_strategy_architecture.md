# 🚀 MemoTattoo (Code Name: MemoTattoo)

**Master Strategy & Architecture Document (One-Pager, PRD, UX & Design Doc)**

## 1\. Product Vision

**The Problem:** Traditional language learning apps rely on hard-coded, rigid answers. They penalize learners for using contractions, synonyms, or alternative phrasing, leading to frustration. Furthermore, rote memorization lacks emotional or personal connection. 

**The Solution:** MemoTattoo is an adaptive, AI-driven English learning ecosystem. It grades based on *semantic meaning* rather than exact strings, acts as a personalized tutor, and uses Generative AI ("Nano Banana") to create hyper-personalized visual flashcards based on the user's specific interests (e.g., Cyberpunk, Cats, Cooking). 

**Platforms:** Native Android App (Student) \+ Angular Web App (Admin Console).

---

## 2\. The GenAI Strategy & Core Mechanics

MemoTattoo splits AI workloads into two tiers to maximize user experience while strictly controlling cloud costs:

1. **Local Model Inference (Text & Grading):**  
   * Runs on-device: using Firebase AI Logic on device using the new Android SDK release.  
   * **Use Case:** Evaluates the user's text input for semantic meaning, handles contractions/synonyms, and provides instant grammatical tips.  
   * **Benefit:** Zero latency, zero cloud API cost, works offline. If the user device doesn't support local AI, it will use a fallback to the cloud.
      
2. **Cloud GenAI \- "Nano Banana" (Image Generation):**  
   * Runs in the cloud via Firebase AI Logic (Gemini).  
   * **Use Case:** Generates custom visual flashcards matching the vocabulary word and the user's chosen aesthetic theme.  
   * **Cost Control (Tokenomics):** There are no shared images in V1. Every image generated costs the creator exactly 1 Energy Bolt.
   
3. **Spaced Repetition System (SRS):** Failed words and grammar concepts are automatically tracked and injected into future daily "Learning Proposals" at expanding intervals to ensure long-term retention.  

4. **The User Economy (Energy Bolts):** Bolts are the core virtual currency governing API usage and creating a creator economy.
   * **Inflows:** Users receive 100 free Bolts on registration. Creators earn +1 Bolt when a user plays their public deck. Users can buy +50 Bolt packs via an Android IAP view.
   * **Outflows:** -1 Bolt to create a deck. -1 Bolt per image generated in a deck. -1 Bolt to play a game (consumed passing the 50% completion mark).
   * **Admin Access:** The Admin Console bypasses all Energy Bolt costs.

---

## 3\. Technical Architecture 

### Tech Stack Overview

* **Mobile App (Student):** Android Native (Kotlin, Jetpack Compose).  
* **Web App (Admin):** Angular (Standalone Components, Reactive Forms, Tailwind CSS).  
* **Backend:** Firebase (Auth, Firestore, Cloud Functions, Cloud Storage, AI Logic, App Check, Remote Config).  
* **AI Integration:** On-device LLM API (Android) \+ Gemini Bano Banana  via Firebase AI Logic using Vertex AI.

### Database Structure (Firestore)

* **`Users`**: `uid`, `level`, `energy_bolts`, `interests[]`, `isBanned`  
* **`Curriculum`**: `level_id`, `mission_title`, `target_vocabulary[]`, `grammar_focus`  
* **`Flashcards` (Shared Pool)**: `id`, `targetWord`, `imageUrl`, `theme`, `isVerified` (Boolean)  
* **`User_Progress` (SRS Tracker)**: `user_id_card_id`, `masteryLevel` (1-5), `nextReviewDate`, `mistakeHistory[]`.

---

## 4\. User Experience (UX) & User Journeys: Android App (Learner)

### **Journey A: Onboarding & "Vibe Check" (Assessment)**

* **Goal:** Determine CEFR level (A1-C2) and personal interests without a boring form.  
* **Tech:** **Local LLM (Android AICore/Gemini Nano)**.  
* **Flow:**  
  * **Login:** User signs in via Firebase Auth (Google/Email).  
  * **The Chat:** An AI Persona appears: *"Hi\! I'm Nano. What are you looking forward to this week?"*  
  * **The Analysis:** User replies audio or text (minimum word count enforced for accurate grading). Local AI analyzes vocabulary complexity and grammar structure (zero latency).  
  * **The Result:** AI assigns a hidden `level` tag (e.g., *Intermediate-B1*) to the user's Firestore profile.  
  * **Personalization:** User selects from a grid of existing visual theme bubbles (e.g., *Cyberpunk, Cottagecore*). They also have an option to create a completely custom theme name, displaying its cost in Energy Bolts.

### **Journey B: The Daily "Learning Proposal"**

* **Goal:** Reduce decision fatigue with a curated daily plan.  
* **Logic:** The app queries Firestore for `Curriculum` matching the user's level \+ `User_Progress` for cards due for review.  
* **UI:** A "Daily Mission" card stack.  
  1. **Mission 1 (New):** Learn 5 new words (Theme: Travel).  
  2. **Mission 2 (Grammar):** Practice "Past Continuous" tense.  
  3. **Mission 3 (SRS Review):** Review 4 items failed yesterday.

### **Journey C: The "Smart Challenge" (Core Loop)**

* **Goal:** Grade based on meaning, not syntax.  
* **Flow:**  
  1. **Prompt:** App shows: *"Translate: No tengo dinero."*  
  2. **Input:** User types: *"I ain't got cash."*  
  3. **Local AI Grading:**  
     * *Check:* Is the meaning correct? **Yes.**  
     * *Check:* Is the grammar formal? **No.**  
  4. **Feedback:** App shows a **Yellow** result (Correct but...).  
     * *Tip:* "You got the meaning\! 'Cash' is great. But 'ain't' is very informal. Try 'I don't have any money' for general use."  
  5. **Visual Anchor (The Nano Banana):**  
     * *Step 1:* App calls Firebase AI Logic \-\> Gemini Generates image.
     * *Step 2:* Saves image to Firebase Storage and URL to Firestore.  
     * *Step 3:* Displays to user. (Cost: 1 Energy Bolt for the Image generation).

### **Journey D: The Monetization Loop (Energy Bolts)**

* **Goal:** Create a sustainable virtual economy.  
* **Flow:**  
  1. **Trigger:** User tries to create a new deck, play a game, or generate an image.  
  2. **Check:** Firebase AI Logic / App Check verify 1 Bolt is available.
  3. **Scenario A (Balance \> 0):** Deduct 1 Bolt.
  4. **Scenario B (Balance \= 0):** Block request. Show Upsell Modal: *"Out of Energy\! Buy a pack of +50 Bolts to keep creating and playing."*

---

## 5\. User Experience (UX) & User Journeys: Angular Web App (Admin Console)

### **Journey E: The "God View" (Dashboard)**

* **Goal:** Monitor ecosystem health.  
* **UI:** Angular Material Cards.  
* **Metrics:**  
  * *Daily Active Users (DAU).*  
  * *Total Flashcards in Shared Pool* (Metric of value).  
  * *API Cost Est.* (Real-time tracking of Nano Banana usage).

### **Journey F: The AI Moderator (Image Gallery)**

* **Goal:** Prevent bad/offensive AI images from polluting the shared pool.  
* **Tech:** Angular `*ngFor` grid with `async` pipe for real-time Firestore updates.  
* **Flow:**  
  1. Admin logs in (AuthGuard checks for `admin: true` claim).  
  2. Navigates to **/moderation**.  
  3. Views a grid of the last 100 generated images.  
  4. **Action:** Clicks "Delete" on a distorted image.  
  5. **Result:** Angular calls Firebase Storage to delete the file and Firestore to remove the document reference. The image vanishes from the Android app instantly.

### **Journey G: The Curriculum Builder**

* **Goal:** Structure lessons without touching raw JSON.  
* **Tech:** Angular Reactive Forms (`FormGroup`, `FormArray`).  
* **Flow:**  
  1. Admin navigates to **/curriculum**.  
  2. Selects "Level A1".  
  3. Clicks "Add Mission".  
  4. Fills out Title ("At the Cafe") and Tags ("coffee", "ordering", "price").  
  5. Clicks **Save as Draft** or **Publish**.  
  6. **Result:** Data is pushed to Firestore. When "Published", next time a learner opens the Android app, this lesson is available in their proposal. Note: We will seed the initial database with 10 published lessons so the onboarding experience is not empty.

---

## 6\. Technical Decisions & Trade-offs

### **1\. AI Architecture: Hybrid Approach**

* **Decision:** Split AI into **Local (Edge)** and **Cloud**.  
* **Reasoning:**  
  * *Text Analysis (Local):* Running grammar checks on-device saves massive API costs and allows the app to work offline (e.g., on the subway).  
  * *Image Generation (Cloud):* High-quality image generation requires cloud GPUs. We gate this behind the "Energy Bolt" system to make the unit economics viable.

### **2\. Database: Public Deck Approval Queue**

* **Decision:** Curate the public library to prevent spam.  
* **Mechanism:** When a user clicks "Make Public" on their Flashcard Deck, it enters a `status: 'pending'` state. 
* **Impact:** The Admin Console views and approves the deck (`status: 'published'`). Once published, the creator earns 1 Energy Bolt every time another user plays it. Only the Admin can modify published public decks to prevent bait-and-switch abuse.

### **3\. Admin Panel: Angular vs. No-Code**

* **Decision:** Build a custom Angular MVP.  
* **Reasoning:** While tools like Retool exist, an Angular app gives us type safety (TypeScript) which mirrors the Android app's data models. This prevents data corruption (e.g., saving a lesson without a required ID). It also allows us to build a custom "Image Moderation Gallery" optimized specifically for visual QA.

### **4\. Backend Logic: Firebase AI Logic & App Check**

* **Decision:** Direct client calls to AI models, secured by App Check.  
* **Reasoning:** We can eliminate the latency and cost of intermediate Cloud Functions. By pairing **Firebase App Check** with **Firebase AI Logic**, we can securely verify that requests to Gemini (Vertex AI Provider) are originating strictly from our verified, untampered Android application.

### **5\. UI Framework: Exclusive Jetpack Compose (Material 3 MVP)**
* **Decision:** Build the Android app exclusively using Jetpack Compose, with Material 3 as the foundation.
* **Reasoning:** Accelerates initial development, enforces modern declarative UI standards, and avoids legacy XML overhead. Keeping the architecture modular lets us easily swap early Material components for highly-customized, gamified Compose UI (like Duolingo) later without rebuilding the core logic flows.

---

## 7\. Backend Workflows & Diagrams

### Flow 1: Image Generation & Security
This flow details how the Android app requests custom Nano Banana illustrations safely without needing a middleman Cloud Function.

```text
[ Android App ] -- 1. Request Image Gen  --> [ Firebase App Check ]
      |                                              |
      v                                              v (Valid Token)
[ Firestore (User Doc) ]                             |
  -- 2. Client verifies internal Energy Bolt >= 1    |
      |                                              v
      +----- 3. Direct secure call --------> [ Firebase AI Logic ]
                                                     |
                                                     v
                                             (Gemini / Vertex)
                                                     |
                                                     v
                            <----------- 4. Returns Generated Image
```

**Step Breakdown:**
1. **Verification**: The Android client calls Firebase AI Logic. Firebase App Check steps in to ensure the request is coming right from our signed, official APK.
2. **Local Validation**: The app confirms internally that the user has at least 1 `Energy Bolt`.
3. **Execution**: The request is passed securely to Vertex AI through AI Logic.
4. **Resolution**: The prompt returns the image securely, storing the result dynamically.

### Flow 2: Spaced Repetition System (Leitner Flow)
The automated tracking of daily review items.

```text
[ Android App ]
      |
      | 1. Submit Answer
      v
[ Firebase AI Logic ] (Local Device Fallback via SDK)
      | 
      | 2. Semantic Grade Check -> (Result: Success)
      |
      v
[ Android App Logic ]
      | 3. Calculate next interval (e.g., +3 days)
      |
      v
[ Firestore: User_Progress Collection ]
{
  user_id_card_id: "userA_card123",
  masteryLevel: 2,
  nextReviewDate: [Timestamp: Now + 3 Days]
}
      |
      | 4. Next Morning Check
      v
[ Android App (Daily Mission Builder) ]
Queries Firestore: "WHERE nextReviewDate <= NOW" -> Fetches cards due today.
```

### Flow 3: Admin Console & Content Moderation

```text
[ Angular Web App ] (Admin Console / Firebase App Hosting)
      |
      | 1. Admin Login (Requires custom 'admin:true')
      v
[ Firebase Auth ]
      |
      | 2. Read Curriculum & Flashcards
      v                                      (Delete Action)
[ Firestore ] <-------------------------------------------+
  - Curriculum Data                                       |
  - Flashcard Metadata (URLs)                             |
      |                                                   |
      | 3. Render Moderation Grid                         |
      v                                                   |
[ UI Gallery ] -----------------> 4. Click "Delete Image" +
                                                          |
                                                          v
                                                 [ Cloud Storage ]
                                                 (Deletes raw file)
```

---

## 8\. Future Roadmap (Post-MVP)

1. **Voice Mode:** Add Speech-to-Text (STT) to the Local AI layer so users can *speak* their answers instead of typing.  
2. **Community Deck Sharing:** Allow users to curate their favorite "Cyberpunk Vocabulary" decks and share them with friends.  

---

## 9\. Summary of Value

**MemoTattoo** moves the "Unit of Learning" from a static text string to a **dynamic, visual concept**. By combining the low-latency of Local AI with the high-engagement of Generative Cloud AI (Nano Banana), and wrapping it in a cost-optimized "Shared Pool" architecture, the app solves the two biggest problems in EdTech: **User Boredom** and **High Operational Costs**.

