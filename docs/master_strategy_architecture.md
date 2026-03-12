# 🚀 MemoTattoo (Project MemoTattoo)

**Master Strategy & Architecture Document (One-Pager, PRD, UX & Design Doc)**

---

## 1. Product Vision

MemoTattoo is a multimodal, AI-first educational ecosystem. It leverages Generative AI to create hyper-personalized, visual-first learning content (flashcard decks) that adapts to user interests. Instead of binary right/wrong strings, it uses a "Game Master" AI to evaluate semantic understanding, provide contextual hints, and guide the learner through a gamified, interactive session.

**Platforms:** 
- **Native Android App (Kotlin/Compose):** The learner-facing interface for discovery, image-based guessing games, and on-the-go deck creation.
- **Angular Web App (Admin Console):** The administrative and content-curation hub for platform-wide moderation, user management, and advanced curriculum design.

---

## 2. Core GenAI Strategy & Mechanics

MemoTattoo utilizes a  AI orchestration layer powered by **Firebase AI Logic**, splitting workloads between creation and gameplay:

### A. The "Flashcard Studio" (Content Creation)
Creators (and Admins) use a 5-step wizard to build "Personalized Curricula" using **Firebase AI Logic Prompt Templates**:
1.  **Topic Breakdown:** Translates a high-level subject (e.g., "Photography Basics") into discrete concepts using `memotattoo-generatate-topic-v1`.
2.  **Concept Refinement:** Visual editing/brainstorming of terms and definitions.
3.  **Global Art Direction:** Users provide text prompts and reference images to define the aesthetic the AI should follow (e.g., "Cyberpunk", "Vintage Oil Painting").
4.  **Multimodal Image Generation:** High-fidelity, isolated images are generated for *each* concept via `memotattoo-generate-concept-image-v1` (Imagen 3.0 via AI Logic). It supports **iterative refinement** of specific images.
5.  **Publishing Workflow:** Decks can be saved as `draft`, `private`, or submitted for public moderation (`pending`).

### B. The "Game Master" (Adaptive Learning)
During a game session, a specialized **Firebase AI Logic** chat agent (`gemini-2.5-flash`) acts as a "Game Master":
-   **Semantic Grading:** It evaluates user guesses based on meaning, allowing for synonyms and phrasing variations.
-   **Interactive Hinting:** If the user is close but not exact, the AI provides a "pista" (hint) based on the concept's definition.
-   **Function Calling:** The AI autonomously triggers game actions using tools like `add_points` and `next_concept` to keep the UI in sync with the conversation logic.

---

## 3. Technical Architecture

### Technology Stack
-   **Frontend (Android):** Jetpack Compose, Material 3, Kotlin Coroutines, MVVM with Flow/StateFlow.
-   **Frontend (Admin/Web):** Angular (v21), Standalone Components, Tailwind CSS, Reactive Forms.
-   **Backend (Firebase):** 
    *   **Cloud Firestore:** Real-time NoSQL database.
    *   **Cloud Storage:** Hosting generated and uploaded assets.
    *   **Firebase AI Logic:** Integrated GenAI hosting (Gemini 2.5 Flash, Imagen 3.0).
    *   **Auth & Security:** Firebase App Check & custom Firestore Security Rules for administrative roles.

### User Economy (Energy Bolts ⚡)
Bolts regulate the usage cost of generative models and create a "creator economy":
-   **Inflows:** New users receive an initial balance. Pro-tier (Scholar) users get monthly top-ups. $1.99 packs for one-time top-ups.
-   **Creators Earn:** Creators receive +1 Bolt when a learner passes the 50% completion mark of their *public* published deck.
-   **Outflows:** 
    *   **Brainstorming:** -1 Bolt.
    *   **Image Generation:** -1 Bolt (Pro/Scholar) or -3 Bolts (Free/Explorer).
    *   *Note: Admins via the Console bypass all cost mechanics.*

---

## 4. Technical Database Structure (Firestore)

-   **`Users`**: Profile data, `energy_bolts`, `isPro`, `isBanned`, `imagesGeneratedThisMonth`.
-   **`FlashcardDecks`**: Metadata for entire sets. Fields: `topic`, `contentBase`, `status` (`draft`, `published`, `pending`, `private`), `owner_id`, `owner_email`, `artDirection`.
-   **`Flashcards`**: The "Shared Pool" of verified individual cards usable across the ecosystem.
-   **`Admins`**: A whitelist collection of email addresses with global RW permissions.
-   **`User_Scores`**: Tracking historical performance per player/deck.
-   **`ActivityLogs`**: Audit trail of administrative actions.

---

## 5. Security & Persistence Logic

### The "Self-Healing" Design
-   **Data Normalization:** A "Reconstruction Layer" ensures that decks created on Android can be seamlessly edited in the Admin Console and vice versa, despite platform-specific serialization differences.
-   **Resilient Persistence:** Android uses a `mutableStateOf` draft system synchronized to Firestore, while the Web Console uses a dual `localStorage` + background Firestore sync to prevent content loss during generation.

### Security Guardrails
-   **App Check:** Protects AI Logic calls from unauthorized scrapers or malicious actors.
-   **Role-Based Access (RBAC):** `firestore.rules` uses custom `isAdmin()` helpers to restrict user deletion, bulk moderation, and curriculum publishing to verified accounts.

---