import { Injectable, signal } from '@angular/core';
import { TemplateChatSession } from 'firebase/ai';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  deckId = signal<string | null>(null);
  deckTitle = signal<string>('Loading Deck...');
  remainingConcepts = signal<any[]>([]);
  currentConcept = signal<any | null>(null);

  score = signal<number>(0);
  timeRemaining = signal<number>(60);
  isSessionActive = signal<boolean>(false);
  isGameOver = signal<boolean>(false);

  chatSession: TemplateChatSession | null = null;
  chatHistory = signal<ChatMessage[]>([]);
  isThinking = signal<boolean>(false);

  timerInterval: any = null;

  resetState() {
    this.deckId.set(null);
    this.deckTitle.set('Loading Deck...');
    this.remainingConcepts.set([]);
    this.currentConcept.set(null);
    this.score.set(0);
    this.timeRemaining.set(60);
    this.isSessionActive.set(false);
    this.isGameOver.set(false);
    this.chatSession = null;
    this.chatHistory.set([]);
    this.isThinking.set(false);
    this.stopTimer();
  }

  startTimer(onTimeout: () => void) {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      const current = this.timeRemaining();
      if (current <= 1) {
        this.timeRemaining.set(0);
        this.stopTimer();
        onTimeout();
      } else {
        this.timeRemaining.set(current - 1);
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
}
