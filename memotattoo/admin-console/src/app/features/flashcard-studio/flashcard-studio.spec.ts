import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FlashcardStudio } from './flashcard-studio';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { UserService } from '../../core/auth/user.service';
import { FlashcardService } from '../../core/services/flashcard.service';
import { AILogicService } from '../../core/services/ai-logic.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BucketService } from '../../core/services/bucket.service';

describe('FlashcardStudio', () => {
  let component: FlashcardStudio;
  let fixture: ComponentFixture<FlashcardStudio>;
  let mockActivityLogService: any;
  let mockUserService: any;
  let mockFlashcardService: any;
  let mockAILogicService: any;
  let mockBucketService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockActivityLogService = {
      info: vi.fn(),
      error: vi.fn(),
      success: vi.fn()
    };
    mockUserService = {
      userProfile: signal(null),
      user: signal(null)
    };
    mockFlashcardService = {
      saveDeck: vi.fn().mockResolvedValue('new-id')
    };
    mockBucketService = {
      uploadDraftImage: vi.fn().mockResolvedValue('https://storage/uploaded.jpg')
    };
    mockAILogicService = {
      brainstormTopic: vi.fn().mockResolvedValue({ items: [] }),
      brainstormMore: vi.fn().mockResolvedValue([]),
      generateConceptImage: vi.fn().mockResolvedValue('mock-image-url'),
      refineConceptImage: vi.fn().mockResolvedValue('mock-refined-url'),
      generateAndPersistConceptImage: vi.fn().mockResolvedValue('https://storage/image.jpg'),
      refineAndPersistConceptImage: vi.fn().mockResolvedValue('https://storage/refined.jpg')
    };

    await TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: ActivityLogService, useValue: mockActivityLogService },
        { provide: UserService, useValue: mockUserService },
        { provide: FlashcardService, useValue: mockFlashcardService },
        { provide: AILogicService, useValue: mockAILogicService },
        { provide: BucketService, useValue: mockBucketService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParamMap: of({ get: () => null })
          }
        },
        {
          provide: Router,
          useValue: { navigate: vi.fn() }
        }
      ]
    }).compileComponents();

    TestBed.overrideComponent(FlashcardStudio, {
      set: {
        templateUrl: undefined,
        styleUrls: undefined,
        template: '<div></div>',
        styles: []
      }
    });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(FlashcardStudio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('saveToGlobalLibrary', () => {
    it('should call flashcardService.saveDeck and preserve ownership when editing', async () => {
      component.topicForm.patchValue({ topic: 'Test Topic' });
      component.editableJson = JSON.stringify({ items: [] });
      component.activeDraftId.set('existing-id');
      component.isEditingExisting.set(true);
      
      component.originalOwnerId.set('original-creator-id');
      component.originalOwnerEmail.set('original@creator.com');
      component.originalIsPublic.set(false);
      component.originalStatus.set('draft');

      await component.saveToGlobalLibrary();

      expect(mockFlashcardService.saveDeck).toHaveBeenCalledWith(
        'existing-id',
        expect.objectContaining({
          owner_id: 'original-creator-id',
          owner_email: 'original@creator.com',
          status: 'draft',
          isPublic: false
        })
      );
    });

    it('should set isPublic to false when status is private', async () => {
      component.topicForm.patchValue({ topic: 'Private Topic' });
      component.editableJson = JSON.stringify({ items: [] });
      component.activeDraftId.set('private-id');
      component.isEditingExisting.set(true);
      
      component.originalStatus.set('private');
      component.originalIsPublic.set(true); 

      await component.saveToGlobalLibrary();

      expect(mockFlashcardService.saveDeck).toHaveBeenCalledWith(
        'private-id',
        expect.objectContaining({
          status: 'private',
          isPublic: false
        })
      );
    });
  });

  describe('AI Logic Calls', () => {
    it('should call aiLogicService.brainstormTopic', async () => {
      component.topicForm.patchValue({ topic: 'Calculus', numConcepts: 10 });
      await component.brainstormTopic();
      expect(mockAILogicService.brainstormTopic).toHaveBeenCalledWith('Calculus', 10);
    });

    it('should use generateAndPersistConceptImage for new images', async () => {
      component.editableJson = JSON.stringify({ title: 'Math', items: [{ term: '1+1', definition: '2' }] });
      component.conceptDrafts.set([{ term: '1+1', definition: '2', images: [], selectedIndex: 0, refinePrompt: '', isGenerating: false }]);
      
      await component.generateConceptImage(0);

      expect(mockAILogicService.generateAndPersistConceptImage).toHaveBeenCalled();
      expect(component.conceptDrafts()[0].images).toContain('https://storage/image.jpg');
    });

    it('should use refineAndPersistConceptImage for refining', async () => {
      component.conceptDrafts.set([{ 
        term: '1+1', 
        definition: '2', 
        images: ['https://storage/old.jpg'], 
        selectedIndex: 0, 
        refinePrompt: 'more colorful', 
        isGenerating: false 
      }]);
      
      // Mock fetch for image download in component
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob())
      }));
      // Mock getAsDataUrl since it's private but uses global FileReader
      vi.spyOn(component as any, 'getAsDataUrl').mockResolvedValue('data:image/png;base64,...');

      await component.refineConceptImage(0);

      expect(mockAILogicService.refineAndPersistConceptImage).toHaveBeenCalledWith(
        expect.any(Object), 
        'data:image/png;base64,...', 
        'more colorful'
      );
      expect(component.conceptDrafts()[0].images).toContain('https://storage/refined.jpg');
    });
  describe('canPublish validation', () => {
    it('should return false for new deck if images are missing', () => {
      component.isEditingExisting.set(false);
      component.conceptDrafts.set([
        { term: 'A', definition: 'B', images: [], selectedIndex: 0, refinePrompt: '', isGenerating: false }
      ]);
      expect(component.canPublish()).toBe(false);
    });

    it('should return true for new deck if all images are present', () => {
      component.isEditingExisting.set(false);
      component.conceptDrafts.set([
        { term: 'A', definition: 'B', images: ['url'], selectedIndex: 0, refinePrompt: '', isGenerating: false }
      ]);
      expect(component.canPublish()).toBe(true);
    });

    it('should return true for existing deck even if images are missing', () => {
      component.isEditingExisting.set(true);
      component.conceptDrafts.set([
        { term: 'A', definition: 'B', images: [], selectedIndex: 0, refinePrompt: '', isGenerating: false }
      ]);
      expect(component.canPublish()).toBe(true);
    });

    it('should return false if there are no concepts at all', () => {
      component.isEditingExisting.set(true);
      component.conceptDrafts.set([]);
      expect(component.canPublish()).toBe(false);
    });
  });
});
});
