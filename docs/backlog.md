# 📋 MemoTattoo Project Backlog

This document tracks upcoming features, improvements, and technical debt for the MemoTattoo platform.

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


### Others
- [ ] Playwright tests for Admin Console
- [ ] Maestro Golden Path tests for Android App
- [ ] Screenshot tests for Android App (Roborazzi)
- [ ] Integration tests for Android App (Robolectric)
- [ ] Edge case tests (Empty states, Network failures)
- [ ] Include Happy Paths: Automatic Function Calling and JSON Schema Generation
- [ ] Change the Console UI Deck Creator to use a stepper UI
- [ ] Include history for chat and function calls in Admin Console game
- [ ] Include Android Hybrid on Android app for the game part. Not sure, how we will solve the issue of the game not being able to load the images.
- [ ] Introduce Cloud Trigger for AI Logic 




