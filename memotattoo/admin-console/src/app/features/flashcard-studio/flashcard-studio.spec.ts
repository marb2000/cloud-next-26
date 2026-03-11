import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FlashcardStudio } from './flashcard-studio';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { UserService } from '../../core/auth/user.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { signal } from '@angular/core';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'mock-collection' })),
  addDoc: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getFirestore: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn()
}));

vi.mock('../../core/firebase/firebase', () => ({
  firestore: {},
  templateModel: {},
  storage: {},
  ai: {}
}));

describe('FlashcardStudio', () => {
  let component: FlashcardStudio;
  let fixture: ComponentFixture<FlashcardStudio>;
  let mockActivityLogService: any;
  let mockUserService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockActivityLogService = {
      info: vi.fn(),
      error: vi.fn()
    };
    mockUserService = {
      userProfile: signal(null),
      user: signal(null)
    };

    await TestBed.configureTestingModule({
      providers: [
        { provide: ActivityLogService, useValue: mockActivityLogService },
        { provide: UserService, useValue: mockUserService },
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

    fixture = TestBed.createComponent(FlashcardStudio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('saveToGlobalLibrary', () => {
    it('should set status to published and isPublic to true when direct publishing', async () => {
      const firestoreModule = await import('firebase/firestore');
      const addDoc = firestoreModule.addDoc as any;
      
      component.topicForm.patchValue({ topic: 'Test Topic' });
      component.editableJson = JSON.stringify({ items: [] });
      component.activeDraftId.set(null); 

      await component.saveToGlobalLibrary();

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          topic: 'Test Topic',
          status: 'published',
          isPublic: true
        })
      );
    });

    it('should use updateDoc when an activeDraftId exists', async () => {
      const firestoreModule = await import('firebase/firestore');
      const updateDoc = firestoreModule.updateDoc as any;
      
      component.topicForm.patchValue({ topic: 'Updated Topic' });
      component.editableJson = JSON.stringify({ items: [] });
      component.activeDraftId.set('existing-id');

      await component.saveToGlobalLibrary();

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          topic: 'Updated Topic',
          status: 'published'
        })
      );
    });

    it('should include art direction metadata in the payload', async () => {
      const firestoreModule = await import('firebase/firestore');
      const addDoc = firestoreModule.addDoc as any;
      
      component.topicForm.patchValue({ topic: 'Art Topic' });
      component.editableJson = JSON.stringify({ items: [] });
      component.activeDraftId.set(null);
      component.artDirection = 'Comic book style';
      component.artDirectionImage = 'base64-image-data';

      await component.saveToGlobalLibrary();

      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          artDirection: 'Comic book style',
          artDirectionImage: 'base64-image-data'
        })
      );
    });

    it('should show "Changes saved" toast when editing existing deck', async () => {
      const firestoreModule = await import('firebase/firestore');
      const updateDoc = firestoreModule.updateDoc as any;
      
      component.topicForm.patchValue({ topic: 'Existing Topic' });
      component.editableJson = JSON.stringify({ items: [] });
      component.activeDraftId.set('existing-id');
      component.isEditingExisting.set(true);

      await component.saveToGlobalLibrary();

      expect(updateDoc).toHaveBeenCalled();
      expect(mockActivityLogService.info).toHaveBeenCalledWith(
        'Deck Saved',
        expect.stringContaining('saved changes to an existing deck')
      );
    });

    it('should preserve original owner and privacy when editing existing deck', async () => {
      const firestoreModule = await import('firebase/firestore');
      const updateDoc = firestoreModule.updateDoc as any;
      
      component.topicForm.patchValue({ topic: 'Existing Topic' });
      component.editableJson = JSON.stringify({ items: [] });
      component.activeDraftId.set('existing-id');
      component.isEditingExisting.set(true);
      
      // Simulate original state
      component.originalOwnerId.set('original-creator-id');
      component.originalOwnerEmail.set('original@creator.com');
      component.originalIsPublic.set(false);
      component.originalStatus.set('draft');

      // Mock current user (the editor)
      mockUserService.user.set({ uid: 'editor-id', email: 'editor@admin.com' });

      await component.saveToGlobalLibrary();

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          owner_id: 'original-creator-id',
          owner_email: 'original@creator.com',
          isPublic: false,
          status: 'draft'
        })
      );
    });

    it('should set isPublic to false when status is private', async () => {
      const firestoreModule = await import('firebase/firestore');
      const updateDoc = firestoreModule.updateDoc as any;
      
      component.topicForm.patchValue({ topic: 'Private Topic' });
      component.editableJson = JSON.stringify({ items: [] });
      component.activeDraftId.set('private-id');
      component.isEditingExisting.set(true);
      
      // Setting status to private
      component.originalStatus.set('private');
      component.originalIsPublic.set(true); // Should be overridden to false

      await component.saveToGlobalLibrary();

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'private',
          isPublic: false
        })
      );
    });
  });
});
