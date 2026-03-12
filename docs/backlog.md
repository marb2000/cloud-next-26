# 📋 MemoTattoo Project Backlog

This document tracks upcoming features, improvements, and technical debt for the MemoTattoo platform.

---

## 🛡️ Security & Resilience

### Firebase App Check Integration
- [ ] **Android Implementation**: Enable Play Integrity in `FirebaseManager.kt` and register in the console.
- [ ] **Web Integration**: Implement reCAPTCHA Enterprise/v3 in the Admin Console.
- [ ] **Enforcement**: Enable App Check enforcement for Firestore, Storage, and Vertex AI to prevent API abuse and cost spikes.

---

## 📊 Admin Console Enhancements

### Advanced Dashboard Analytics
#### Token Monitoring
- [ ] **Gemini Usage**: Implement a counter to track LLM and Image Generation token/request counts per user and globally.
- [ ] **Cost Alerts**: Add visual indicators for high-usage periods.

#### Gameplay Statistics
- [ ] **User Engagement**: Dashboard chart showing daily active users and "Games Played" count.
- [ ] **Deck Popularity**: Table/Chart showing most played and highest-rated decks.
- [ ] **Energy Flow**: Track total Energy Bolts generated vs. consumed for economy balancing.

---

## 📱 Mobile App Improvements

### User Experience
- [ ] **Voice Interaction**: Moving from text guesses to multimodal voice-to-logic gameplay.
- [ ] **Offline Mode**: Enable Firestore persistence for basic deck browsing without a connection.



