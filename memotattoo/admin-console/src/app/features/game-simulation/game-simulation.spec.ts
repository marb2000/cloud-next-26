import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameSimulation } from './game-simulation';
import { ActivatedRoute, Router } from '@angular/router';
import { GameStateService } from './game-state.service';
import { UserService } from '../../core/auth/user.service';
import { AILogicService } from '../../core/services/ai-logic.service';
import { FlashcardService } from '../../core/services/flashcard.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('GameSimulation', () => {
  let component: GameSimulation;
  let fixture: ComponentFixture<GameSimulation>;
  let mockAILogicService: any;
  let mockFlashcardService: any;

  beforeEach(async () => {
    const mockActivatedRoute = {
      snapshot: { paramMap: { get: () => 'test-deck-id' } },
      params: of({ deckId: 'test-deck-id' })
    };

    const mockRouter = {
      navigate: vi.fn()
    };

    const mockGameStateService = {
      deckTitle: signal('Test Deck'),
      remainingConcepts: signal([]),
      currentConcept: signal(null),
      score: signal(0),
      timeRemaining: signal(0),
      isSessionActive: signal(false),
      isGameOver: signal(false),
      chatHistory: signal([]),
      isThinking: signal(false),
      stopTimer: vi.fn(),
      startTimer: vi.fn()
    };

    const mockUserService = {
      user: signal({ uid: 'test-uid' }),
      rewardCreator: vi.fn()
    };

    mockAILogicService = {
      startGameMasterChat: vi.fn().mockResolvedValue({ sendMessage: vi.fn() }),
      sendGameGuess: vi.fn().mockResolvedValue({ text: 'AI response' })
    };

    mockFlashcardService = {
      getDeckById: vi.fn().mockResolvedValue({ topic: 'Test Deck', contentBase: { items: [] } })
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: GameStateService, useValue: mockGameStateService },
        { provide: UserService, useValue: mockUserService },
        { provide: AILogicService, useValue: mockAILogicService },
        { provide: FlashcardService, useValue: mockFlashcardService }
      ]
    }).compileComponents();

    TestBed.overrideComponent(GameSimulation, {
      set: {
        templateUrl: undefined,
        styleUrl: undefined,
        template: '<div></div>',
        styles: []
      }
    });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(GameSimulation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should delegate chat guesses to aiLogicService', async () => {
    component.userInput.set('My guess');
    component.state.chatSession = {} as any;
    
    await component.sendGuess();

    expect(mockAILogicService.sendGameGuess).toHaveBeenCalledWith(expect.any(Object), 'My guess');
    expect(component.chatHistory()).toContainEqual(expect.objectContaining({ role: 'model', text: 'AI response' }));
  });
});
