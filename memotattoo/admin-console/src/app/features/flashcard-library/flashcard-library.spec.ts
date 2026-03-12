import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FlashcardLibrary } from './flashcard-library';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { Router } from '@angular/router';
import { FlashcardService, FlashcardDeck } from '../../core/services/flashcard.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';

describe('FlashcardLibrary', () => {
  let component: FlashcardLibrary;
  let fixture: ComponentFixture<FlashcardLibrary>;
  let mockActivityLogService: any;
  let mockRouter: any;
  let mockFlashcardService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockActivityLogService = {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn()
    };
    mockRouter = {
      navigate: vi.fn()
    };
    mockFlashcardService = {
      getDecks: vi.fn().mockReturnValue(of([])),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      deleteDeck: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: ActivityLogService, useValue: mockActivityLogService },
        { provide: Router, useValue: mockRouter },
        { provide: FlashcardService, useValue: mockFlashcardService }
      ]
    }).compileComponents();

    TestBed.overrideComponent(FlashcardLibrary, {
      set: {
        templateUrl: undefined,
        styleUrls: undefined,
        template: '<div></div>',
        styles: []
      }
    });

    fixture = TestBed.createComponent(FlashcardLibrary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and fetch decks from service', () => {
    expect(component).toBeTruthy();
    expect(mockFlashcardService.getDecks).toHaveBeenCalled();
  });

  describe('executeStatusUpdate', () => {
    it('should call flashcardService.updateStatus when publishing', async () => {
      await component.executeStatusUpdate('deck-123', 'published');
      expect(mockFlashcardService.updateStatus).toHaveBeenCalledWith('deck-123', 'published');
    });

    it('should call flashcardService.updateStatus when setting private', async () => {
      await component.executeStatusUpdate('deck-123', 'private');
      expect(mockFlashcardService.updateStatus).toHaveBeenCalledWith('deck-123', 'private');
    });
  });

  describe('handleConfirmAction', () => {
    it('should call deleteDeck when type is delete', async () => {
      component.pendingAction.set({
        type: 'delete',
        id: 'deck-1',
        title: 'Delete',
        message: 'Are you sure?',
        intent: 'danger',
        confirmText: 'Delete'
      });

      await component.handleConfirmAction();
      expect(mockFlashcardService.deleteDeck).toHaveBeenCalledWith('deck-1');
      expect(mockActivityLogService.info).toHaveBeenCalledWith('Deleted Deck', expect.any(String));
    });

    it('should call updateStatus when type is unlock', async () => {
      component.pendingAction.set({
        type: 'unlock',
        id: 'deck-1',
        title: 'Unlock',
        message: 'Are you sure?',
        intent: 'info',
        confirmText: 'Unlock'
      });

      await component.handleConfirmAction();
      expect(mockFlashcardService.updateStatus).toHaveBeenCalledWith('deck-1', 'draft');
      expect(mockActivityLogService.warning).toHaveBeenCalledWith('Unlocked Deck', expect.any(String));
    });
  });

  describe('Filtering', () => {
    it('should filter correctly based on showPrivateDecks', () => {
      component.decks.set([
        { id: '1', topic: 'Public', status: 'published' } as any,
        { id: '2', topic: 'Private', status: 'private' } as any
      ]);
      
      component.showPrivateDecks.set(false);
      expect(component.filteredDecks().length).toBe(1);
      
      component.showPrivateDecks.set(true);
      expect(component.filteredDecks().length).toBe(2);
    });
  });
});
