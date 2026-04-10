import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, AfterViewChecked, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GameStateService } from './game-state.service';
import { UserService } from '../../core/auth/user.service';
import { FlashcardService } from '../../core/services/flashcard.service';
import { AILogicService } from '../../core/services/ai-logic.service';

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
  userService = inject(UserService);
  flashcardService = inject(FlashcardService);
  aiLogicService = inject(AILogicService);

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
      const data = await this.flashcardService.getDeckById(deckId);
      if (data) {
        this.deckTitle.set(data.topic || 'Untitled Deck');
        this.deckOwnerId = data.owner_id || null;

        // Load items with images into the remaining queue
        const items = data.contentBase?.items || [];
        const validItems = items.filter((item: any) => item.imageArt && item.imageArt.length > 0);

        // Initialize bolt tracking
        this.initialConceptCount = validItems.length;
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
    // Initialize AI Chat for this specific concept
    try {
      this.state.chatSession = this.aiLogicService.startGameMasterChat(
        concept,
        // onAddPoints (async callback)
        async (args: any) => {
          console.log("GM Function Call: add_points", args);
          const pts = args.points || 10;
          this.score.update(s => s + pts);
          this.scoreAnimation.set({ points: pts, visible: true });
          setTimeout(() => this.scoreAnimation.update(s => ({ ...s, visible: false })), 2500);
          return { success: true };
        },
        // onNextConcept (async callback)
        async (args: any) => {
          console.log("GM Function Call: next_concept");
          setTimeout(() => this.nextRound(), 2500);
          return { success: true };
        }
      );

      // Kick off the conversation
      this.isThinking.set(true);
      const result = await this.state.chatSession.sendMessage("Start the round.");
      this.chatHistory.update(h => [...h, { role: 'model', text: result.response.text() }]);
    } catch (e) {
      console.error("Failed to initialize AI Chat:", e);
      this.chatHistory.update(h => [...h, { role: 'model', text: "Error connecting to the Game Master." }]);
    } finally {
      this.isThinking.set(false);
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
      console.log("GM Response received:", result);
      
      let responseText = '';
      try {
        responseText = result.response.text();
      } catch (e) {
        console.warn("No text in response (might be purely function calls)");
      }

      if (responseText) {
        this.chatHistory.update(h => [...h, { role: 'model', text: responseText }]);
        
        // --- MANUAL FALLBACK --- 
        // If the model types the calls as text instead of using the Tool API, we process them anyway
        if (responseText.includes('add_points')) {
           const match = responseText.match(/add_points\((\d+)\)/);
           const pts = match ? parseInt(match[1]) : 10;
           console.log("Manual Fallback: add_points triggered from text", pts);
           this.score.update(s => s + pts);
           this.scoreAnimation.set({ points: pts, visible: true });
           setTimeout(() => this.scoreAnimation.update(s => ({ ...s, visible: false })), 2500);
        }
        if (responseText.includes('next_concept')) {
           console.log("Manual Fallback: next_concept triggered from text");
           setTimeout(() => this.nextRound(), 2500);
        }
      }
    } catch (e) {
      console.error("Chat error:", e);
      this.chatHistory.update(h => [...h, { role: 'model', text: "Whoops, I lost my train of thought. Try again!" }]);
    } finally {
      this.isThinking.set(false);
    }
  }
}
