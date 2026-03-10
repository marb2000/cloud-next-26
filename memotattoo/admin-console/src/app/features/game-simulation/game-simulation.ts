import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, AfterViewChecked, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { doc, getDoc } from 'firebase/firestore';
import { firestore, ai } from '../../core/firebase/firebase';
import { getGenerativeModel, ChatSession } from 'firebase/ai';
import { GameStateService, ChatMessage } from './game-state.service';
import { UserService } from '../../core/auth/user.service'; // Added import
import { ResizeText } from '../../shared/directives/resize-text';

@Component({
  selector: 'app-game-simulation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './game-simulation.html',
  styleUrl: './game-simulation.css',
})
export class GameSimulation implements OnInit, OnDestroy, AfterViewChecked {
  route = inject(ActivatedRoute);
  router = inject(Router);
  state = inject(GameStateService);
  userService = inject(UserService); // Added injection

  @ViewChild('chatFeed') private chatFeedContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef<HTMLInputElement>;

  // Proxied Persistent State
  deckTitle = this.state.deckTitle;
  remainingConcepts = this.state.remainingConcepts;
  currentConcept = this.state.currentConcept;
  score = this.state.score;
  timeRemaining = this.state.timeRemaining;
  isSessionActive = this.state.isSessionActive;
  isGameOver = this.state.isGameOver;
  chatHistory = this.state.chatHistory;
  isThinking = this.state.isThinking;

  // Local ephemeral state
  userInput = signal<string>('');
  isImageZoomed = signal<boolean>(false);
  scoreAnimation = signal<{ points: number, visible: boolean }>({ points: 0, visible: false });
  timeoutAnimation = signal<boolean>(false);

  // Added properties for bolt deduction logic
  private initialConceptCount = 0;
  private hasPaidForSession = false;
  private deckOwnerId: string | null = null;

  constructor() {
    effect(() => {
      const thinking = this.isThinking();
      if (!thinking && this.chatInput?.nativeElement) {
        setTimeout(() => {
          this.chatInput.nativeElement.focus();
        }, 10); // Small delay to ensure the DOM has re-enabled the input
      }
    });
  }

  async ngOnInit() {
    const deckId = this.route.snapshot.paramMap.get('deckId');
    if (!deckId) {
      this.deckTitle.set('No Deck Selected');
      // remain in the view, letting the HTML handle the empty state
      return;
    }
    await this.loadDeck(deckId);
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.chatFeedContainer.nativeElement.scrollTop = this.chatFeedContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  async loadDeck(deckId: string) {
    try {
      const docRef = doc(firestore, 'FlashcardDecks', deckId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        this.deckTitle.set(data['topic'] || 'Untitled Deck');
        this.deckOwnerId = data['owner_id'] || null; // Added this line

        // Load items with images into the remaining queue
        const validItems = (data['contentBase']?.items || []).filter((item: any) => item.imageArt && item.imageArt.length > 0);

        // Initialize bolt tracking
        this.initialConceptCount = validItems.length; // Track total valid concepts for the session
        this.hasPaidForSession = false;

        // Shuffle the concepts for random gameplay
        this.remainingConcepts.set(this.shuffleArray(validItems));
      } else {
        console.error("No such deck found!");
      }
    } catch (e) {
      console.error("Error loading deck:", e);
    }
  }

  startGame() {
    if (this.remainingConcepts().length === 0) {
      alert("This deck doesn't have any complete concepts with images to play.");
      return;
    }
    this.score.set(0);
    this.isGameOver.set(false);
    this.isSessionActive.set(true);
    this.isImageZoomed.set(false);

    this.nextRound();
  }

  stopGame() {
    this.isSessionActive.set(false);
    this.isGameOver.set(true);
    this.isImageZoomed.set(false);
    this.stopTimer();
    this.state.chatSession = null;
  }

  toggleZoom() {
    this.isImageZoomed.update(v => !v);
  }

  async nextRound() {
    // Check if user has passed the 50% threshold to charge a bolt
    if (!this.hasPaidForSession && this.initialConceptCount > 0) {
      const conceptsCompleted = this.initialConceptCount - this.remainingConcepts().length;
      if (conceptsCompleted >= Math.ceil(this.initialConceptCount / 2)) {
        this.hasPaidForSession = true;
        // Admins don't pay bolts on the web, but the creator should still get rewarded

        // Reward the creator if this is a public deck played by someone else
        const currentUser = this.userService.user();
        if (currentUser && this.deckOwnerId && currentUser.uid !== this.deckOwnerId) {
          try {
            await this.userService.rewardCreator(this.deckOwnerId, 1);
          } catch (e) {
            console.error("Failed to reward creator", e);
          }
        }
      }
    }

    const remaining = this.remainingConcepts();
    if (remaining.length === 0) {
      this.stopGame();
      return;
    }

    // Pop the next concept
    const nextItem = remaining[0];
    this.remainingConcepts.set(remaining.slice(1));
    this.currentConcept.set(nextItem);

    // Reset Round State
    this.isImageZoomed.set(false);
    this.chatHistory.set([]);
    this.startTimer(60);

    // Initialize AI Chat for this specific concept
    await this.initAIChat(nextItem);
  }

  startTimer(seconds: number) {
    this.timeRemaining.set(seconds);
    this.state.startTimer(() => this.handleTimeout());
  }

  stopTimer() {
    this.state.stopTimer();
  }

  handleTimeout() {
    this.timeoutAnimation.set(true);
    this.chatHistory.update(h => [...h, { role: 'model', text: `Time's up! The correct answer was **${this.currentConcept()?.term}**. Let's move to the next one.` }]);
    setTimeout(() => {
      this.timeoutAnimation.set(false);
      this.nextRound();
    }, 5000); // Increased from 3000ms to 5000ms per user request
  }

  private shuffleArray(array: any[]) {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  // --- AI Integration ---

  async initAIChat(concept: any) {
    try {
      const model = getGenerativeModel(ai, {
        model: 'gemini-2.5-flash',
        systemInstruction: `You are the Game Master for a flashcard guessing game. 
You are testing the user on the term: "${concept.term}".
The definition of this term is: "${concept.definition}".
The user is currently looking at an AI-generated image representing this concept.

Your job:
1. Start the round by saying: "What am I thinking of?" or a similar inviting question.
2. Evaluate the user's guesses. 
3. If they guess exactly the term "${concept.term}", you MUST first explicitly state how many points you are awarding them and why (e.g. "Spot on! That's 10 points for getting it on the first try!"). 
4. Immediately after your explanation, MUST call the \`add_points\` function with the calculated score (max 10, lower if they needed many hints), followed immediately by the \`next_concept\` function to advance the game.
5. If their guess is very close or related, act as a helpful tutor and give them a hint (a 'pista') based on the definition to steer them closer. Do not give away the exact word unless time runs out.
6. Keep your responses short, energetic, and engaging!`,
        tools: [{
          functionDeclarations: [
            {
              name: "add_points",
              description: "Award points to the user for guessing correctly.",
              parameters: {
                type: "object",
                properties: { points: { type: "number", description: "Points to award, from 1 to 10." } },
                required: ["points"]
              }
            },
            {
              name: "next_concept",
              description: "Advances the game to the next flashcard concept.",
              parameters: { type: "object", properties: {} }
            }
          ]
        }]
      });

      this.state.chatSession = await model.startChat();

      // Kick off the conversation
      this.isThinking.set(true);
      const result = await this.state.chatSession.sendMessage("Start the round.");
      this.isThinking.set(false);
      this.chatHistory.update(h => [...h, { role: 'model', text: result.response.text() }]);

    } catch (e) {
      console.error("Failed to initialize AI Chat:", e);
      this.chatHistory.update(h => [...h, { role: 'model', text: "Error connecting to the Game Master." }]);
    }
  }

  async sendGuess() {
    const text = this.userInput().trim();
    if (!text || !this.state.chatSession || this.isThinking()) return;

    this.userInput.set('');
    this.chatHistory.update(h => [...h, { role: 'user', text }]);
    this.isThinking.set(true);

    try {
      const result = await this.state.chatSession.sendMessage(text);
      await this.handleAIResponse(result);
    } catch (e) {
      console.error("Chat error:", e);
      this.chatHistory.update(h => [...h, { role: 'model', text: "Whoops, I lost my train of thought. Try again!" }]);
    } finally {
      this.isThinking.set(false);
    }
  }

  private async handleAIResponse(result: any) {
    let textResponse = '';
    try {
      textResponse = result.response.text();
    } catch (e) {
      // It's normal for text() to throw an error if the response only contains function calls
    }

    if (textResponse) {
      this.chatHistory.update(h => [...h, { role: 'model', text: textResponse }]);
    }

    const functionCalls = result.response.functionCalls();
    if (functionCalls && functionCalls.length > 0) {
      const responses = [];
      let shouldAdvance = false;

      for (const call of functionCalls) {
        if (call.name === 'add_points') {
          const pts = (call.args as any).points || 10;
          this.score.update(s => s + pts);

          // Trigger Score Animation
          this.scoreAnimation.set({ points: pts, visible: true });
          setTimeout(() => {
            this.scoreAnimation.update(s => ({ ...s, visible: false }));
          }, 2500); // Hide after animation completes

          responses.push({ functionResponse: { name: call.name, response: { success: true } } });
        } else if (call.name === 'next_concept') {
          responses.push({ functionResponse: { name: call.name, response: { success: true } } });
          shouldAdvance = true;
        }
      }

      if (shouldAdvance) {
        // Stop processing loop and advance to the next round after a small reading delay
        setTimeout(() => {
          this.nextRound();
        }, 2500);
        return;
      } else {
        // If we processed function calls but didn't advance, send the results back to the model
        // and recursively handle its subsequent response (which might be another function call or text)
        if (this.state.chatSession) {
          const nextResult = await this.state.chatSession.sendMessage(responses);
          await this.handleAIResponse(nextResult);
        }
      }
    }
  }

}
