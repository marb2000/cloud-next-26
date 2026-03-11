import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeckModeration } from './deck-moderation';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { ModerationService, PendingDeck } from '../../core/services/moderation.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';

describe('DeckModeration', () => {
  let component: DeckModeration;
  let fixture: ComponentFixture<DeckModeration>;
  let mockActivityLogService: any;
  let mockModerationService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockActivityLogService = {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      warning: vi.fn()
    };
    mockModerationService = {
      getPendingDecks: vi.fn().mockReturnValue(of([
        { id: 'deck-1', title: 'Pending Deck 1', status: 'pending', isPublic: true, items: [] }
      ])),
      approveDeck: vi.fn().mockResolvedValue(undefined),
      rejectDeck: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: ActivityLogService, useValue: mockActivityLogService },
        { provide: ModerationService, useValue: mockModerationService }
      ]
    }).compileComponents();

    TestBed.overrideComponent(DeckModeration, {
      set: {
        templateUrl: undefined,
        styleUrls: undefined,
        template: '<div></div>',
        styles: []
      }
    });

    fixture = TestBed.createComponent(DeckModeration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and fetch pending decks from service', () => {
    expect(component).toBeTruthy();
    expect(component.decks().length).toBe(1);
    expect(mockModerationService.getPendingDecks).toHaveBeenCalled();
  });

  describe('Approval/Rejection', () => {
    const mockDeck: PendingDeck = {
      id: 'deck-1',
      title: 'Pending Deck 1',
      status: 'pending',
      isPublic: true,
      items: []
    };

    it('should show approval prompt', () => {
      component.promptApprove(mockDeck);
      expect(component.pendingAction()).toEqual(expect.objectContaining({
        id: 'deck-1',
        title: 'Approve Public Deck'
      }));
    });

    it('should call moderationService.approveDeck on confirmation', async () => {
      component.promptApprove(mockDeck);
      await component.onConfirm();

      expect(mockModerationService.approveDeck).toHaveBeenCalledWith('deck-1');
      expect(mockActivityLogService.success).toHaveBeenCalledWith('Deck Approved', expect.any(String));
    });

    it('should call moderationService.rejectDeck on confirmation', async () => {
      component.promptReject(mockDeck);
      await component.onConfirm();

      expect(mockModerationService.rejectDeck).toHaveBeenCalledWith('deck-1');
      expect(mockActivityLogService.warning).toHaveBeenCalledWith('Deck Rejected', expect.any(String));
    });
  });

  describe('Zoom UI', () => {
    it('should open and close zoom', () => {
      const item = { term: 'Test', definition: 'Desc' };
      component.openZoom(item);
      expect(component.zoomedItem()).toBe(item);
      
      component.closeZoom();
      expect(component.zoomedItem()).toBeNull();
    });
  });
});
