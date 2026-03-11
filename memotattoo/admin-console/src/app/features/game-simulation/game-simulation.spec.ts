import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameSimulation } from './game-simulation';
import { ActivatedRoute, Router } from '@angular/router';
import { GameStateService } from './game-state.service';
import { UserService } from '../../core/auth/user.service';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('GameSimulation', () => {
  let component: GameSimulation;
  let fixture: ComponentFixture<GameSimulation>;

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

    await TestBed.configureTestingModule({
      imports: [GameSimulation],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: GameStateService, useValue: mockGameStateService },
        { provide: UserService, useValue: mockUserService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameSimulation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
