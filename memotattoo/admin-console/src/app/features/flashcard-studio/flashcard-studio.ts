import { Component, signal, OnInit, effect, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { UserService } from '../../core/auth/user.service';
import { Observable } from 'rxjs'; 
import { FlashcardService } from '../../core/services/flashcard.service';
import { AILogicService } from '../../core/services/ai-logic.service';
import { BucketService } from '../../core/services/bucket.service';
import { firestore } from '../../core/firebase/firebase';

const DRAFT_STORAGE_KEY = 'memotattoo_flashcard_draft';

interface ConceptDraft {
  term: string;
  definition: string;
  images: string[];
  selectedIndex: number;
  refinePrompt: string;
  isGenerating: boolean;
}

@Component({
  selector: 'app-flashcard-studio',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './flashcard-studio.html',
  styleUrls: ['./flashcard-studio.css']
})
export class FlashcardStudio implements OnInit {
  topicForm: FormGroup;

  // Toast State
  toastMessage = signal<string | null>(null);
  toastType = signal<'success' | 'error'>('success');
  toastTimeout: any;

  viewingImages = signal<string[]>([]);
  viewingImageIndex = signal<number>(0);

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toastMessage.set(message);
    this.toastType.set(type);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage.set(null);
    }, 5000);
  }

  // State
  isGeneratingContent = signal<boolean>(false);
  generatedContent = signal<any | null>(null);
  editorMode = signal<'visual' | 'json'>('visual');
  visualItems = signal<{ term: string, definition: string }[]>([]);
  editableJson: string = '';
  artDirection: string = '';
  artDirectionImage: string | null = null;
  isUploadingArtDirection = signal<boolean>(false);

  conceptDrafts = signal<ConceptDraft[]>([]);
  isSaving = signal<boolean>(false);
  activeDraftId = signal<string | null>(null);
  isEditingExisting = signal<boolean>(false);
  showDeleteConfirm = signal<boolean>(false);
  originalStatus = signal<string>('draft');
  originalIsPublic = signal<boolean>(false);
  originalOwnerId = signal<string>('');
  originalOwnerEmail = signal<string>('');

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private logger = inject(ActivityLogService);
  public userService = inject(UserService);
  private flashcardService = inject(FlashcardService);
  private aiLogicService = inject(AILogicService);
  private bucketService = inject(BucketService);
  private fb = inject(FormBuilder); 

  constructor() {
    this.topicForm = this.fb.group({
      topic: ['', Validators.required],
      numConcepts: [5, [Validators.required, Validators.min(1), Validators.max(20)]]
    });

    // Auto-save form changes to draft
    this.topicForm.valueChanges.subscribe(() => {
      this.saveDraft();
    });
  }

  ngOnInit() {
    this.loadDraft();
  }

  // --- Draft Persistence (LocalStorage & Firestore) ---

  saveDraft() {
    if (this.isGeneratingContent() || this.isGeneratingAny()) return;

    // Remove isGenerating for LS to avoid weird UI state rehydration
    const cleanDrafts = this.conceptDrafts().map(c => ({ ...c, isGenerating: false }));

    const draftData = {
      formValue: this.topicForm.value,
      editableJson: this.editableJson,
      artDirection: this.artDirection,
      artDirectionImage: this.artDirectionImage,
      conceptDrafts: cleanDrafts,
      activeDraftId: this.activeDraftId(),
      isEditingExisting: this.isEditingExisting(),
      originalStatus: this.originalStatus(),
      originalIsPublic: this.originalIsPublic(),
      originalOwnerId: this.originalOwnerId(),
      originalOwnerEmail: this.originalOwnerEmail()
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));

    // Background Firestore Sync
    this.syncFirestoreDraft();
  }

  private async syncFirestoreDraft() {
    // Only sync to Firestore if we have an active draft ID OR at least one image has been generated.
    const hasAnyImage = this.conceptDrafts().some(c => c.images && c.images.length > 0);
    const currentId = this.activeDraftId();

    if (!currentId && !hasAnyImage) {
      return; // Defer Firestore document creation until an image is generated
    }

    // Create publishable payload structure
    let data;
    try {
      data = JSON.parse(this.editableJson || '{}');
    } catch (e) {
      data = {};
    }

    const drafts = this.conceptDrafts();
    for (let i = 0; i < drafts.length; i++) {
      if (data.items && data.items[i]) {
        data.items[i].imageArt = drafts[i].images[drafts[i].selectedIndex] || null;
      }
    }

    const payload = {
      topic: this.topicForm.value?.topic || 'Untitled Draft',
      contentBase: data,
      artDirection: this.artDirection || null,
      artDirectionImage: this.artDirectionImage || null,
      publishedAt: new Date().toISOString(),
      status: this.isEditingExisting() ? this.originalStatus() : 'draft',
      isPublic: this.isEditingExisting() ? this.originalIsPublic() : false,
      owner_id: this.isEditingExisting() ? (this.originalOwnerId() || null) : (this.userService.user()?.uid || null),
      owner_email: this.isEditingExisting() ? (this.originalOwnerEmail() || null) : (this.userService.user()?.email || null)
    };
    
    // Explicitly override isPublic if status is private or draft
    if (payload.status === 'private' || payload.status === 'draft') {
      payload.isPublic = false;
    }

    try {
      const docId = await this.flashcardService.saveDeck(currentId, this.sanitizePayload(payload));
      if (!currentId) {
        this.activeDraftId.set(docId);

        // Re-cache locally so we don't accidentally create duplicates on refresh
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (raw) {
          const draftData = JSON.parse(raw);
          draftData.activeDraftId = docId;
          localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
        }
      }
    } catch (e) {
      console.warn("Failed to silently sync draft with Firestore: ", e);
    }
  }

  loadDraft() {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      try {
        const draftData = JSON.parse(raw);
        if (draftData.formValue) {
          this.topicForm.patchValue(draftData.formValue, { emitEvent: false });
        }
        this.editableJson = draftData.editableJson || '';
        this.artDirection = draftData.artDirection || '';
        this.artDirectionImage = draftData.artDirectionImage || null;
        if (this.editableJson) {
          try {
            const parsed = JSON.parse(this.editableJson);
            this.generatedContent.set(parsed);
            if (parsed.items && Array.isArray(parsed.items)) {
              this.visualItems.set(parsed.items);
            }
          } catch (e) { /* ignore parse error on load */ }
        }

        const draftDrafts = draftData.conceptDrafts || [];
        // Migration: fix selectedIndex if it's -1 but images exist
        draftDrafts.forEach((c: any) => {
          if ((c.selectedIndex === -1 || c.selectedIndex === undefined) && c.images && c.images.length > 0) {
            c.selectedIndex = 0;
          }
        });
        this.conceptDrafts.set(draftDrafts);
        if (draftData.activeDraftId) {
          this.activeDraftId.set(draftData.activeDraftId);
        }
        if (draftData.isEditingExisting) {
          this.isEditingExisting.set(draftData.isEditingExisting);
        }
        if (draftData.originalStatus) this.originalStatus.set(draftData.originalStatus);
        if (draftData.originalIsPublic !== undefined) this.originalIsPublic.set(draftData.originalIsPublic);
        if (draftData.originalOwnerId) this.originalOwnerId.set(draftData.originalOwnerId);
        if (draftData.originalOwnerEmail) this.originalOwnerEmail.set(draftData.originalOwnerEmail);
      } catch (e) {
        console.warn("Failed to parse LocalStorage Draft.");
      }
    }
  }

  async clearDraft() {
    this.showDeleteConfirm.set(false);
    const draftId = this.activeDraftId();

    // If the user is editing an existing established deck, "Discard Changes" shouldn't delete the Firestore Doc.
    if (this.isEditingExisting()) {
      this.logger.info('Discarded Edits', `Discarded local edits for library deck ID: ${draftId}`);
      this.resetLocalState();
      this.router.navigate(['/flashcard-library']);
      return;
    }

    if (draftId) {
      try {
        await this.flashcardService.deleteDeck(draftId);
        this.logger.info('Deleted Draft', `Permanently deleted transient draft ID: ${draftId}`);
      } catch (e) {
        console.error("Failed to delete draft from Firestore", e);
        this.logger.error('Delete Draft Failed', `Could not delete draft ID: ${draftId}`, e);
      }
    } else {
      this.logger.info('Cleared Local Draft', 'Cleared an unsaved local draft');
    }

    this.resetLocalState();
  }

  private resetLocalState() {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    this.topicForm.reset({ numConcepts: 5 }, { emitEvent: false }); // FIX: ensure form reset doesn't trigger valueChanges saveDraft
    this.generatedContent.set(null);
    this.editableJson = '';
    this.artDirection = '';
    this.conceptDrafts.set([]);
    this.activeDraftId.set(null);
    this.isEditingExisting.set(false);
  }

  hasDraft(): boolean {
    return !!localStorage.getItem(DRAFT_STORAGE_KEY);
  }

  onJsonEdited() {
    this.saveDraft();
    try {
      const parsed = JSON.parse(this.editableJson);
      if (parsed.items && Array.isArray(parsed.items)) {
        this.visualItems.set(parsed.items);

        // Sync drafts if titles changed in JSON
        this.conceptDrafts.update(drafts => {
          const newDrafts = [...drafts];
          for (let i = 0; i < parsed.items.length; i++) {
            if (newDrafts[i]) {
              newDrafts[i].term = parsed.items[i].term;
              newDrafts[i].definition = parsed.items[i].definition;
            } else {
              // A new item was manually added to JSON
              newDrafts.push({
                term: parsed.items[i].term,
                definition: parsed.items[i].definition,
                images: [],
                selectedIndex: 0,
                refinePrompt: '',
                isGenerating: false
              });
            }
          }
          // Trim drafts if items were removed
          if (newDrafts.length > parsed.items.length) {
            newDrafts.splice(parsed.items.length);
          }
          return newDrafts;
        });
      }
    } catch (e) {
      // Ignored: JSON is currently invalid
    }
  }

  onVisualItemEdited(index: number, field: 'term' | 'definition', newValue: string) {
    this.visualItems.update(items => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [field]: newValue };
      return newItems;
    });

    try {
      const currentJson = JSON.parse(this.editableJson);
      currentJson.items = this.visualItems();
      this.editableJson = JSON.stringify(currentJson, null, 2);
      this.onJsonEdited();
    } catch (e) { /* ignore */ }
  }

  removeConcept(index: number) {
    this.visualItems.update(items => {
      const newItems = [...items];
      newItems.splice(index, 1);
      return newItems;
    });

    try {
      const currentJson = JSON.parse(this.editableJson);
      currentJson.items = this.visualItems();
      this.editableJson = JSON.stringify(currentJson, null, 2);
    } catch (e) { /* ignore */ }

    this.conceptDrafts.update(drafts => {
      const newDrafts = [...drafts];
      newDrafts.splice(index, 1);
      return newDrafts;
    });

    this.saveDraft();
  }

  onVisualTitleEdited(newTitle: string) {
    try {
      const currentJson = JSON.parse(this.editableJson);
      currentJson.title = newTitle;
      this.editableJson = JSON.stringify(currentJson, null, 2);
      this.saveDraft();
    } catch (e) { /* ignore */ }
  }

  syncConceptsFromJson() {
    try {
      const data = JSON.parse(this.editableJson);
      this.generatedContent.set(data);
      if (data && Array.isArray(data.items)) {
        const current = [...this.conceptDrafts()];
        const updated = data.items.map((item: any, idx: number) => {
          const existing = current[idx];
          if (existing && existing.term === item.term) {
            return { ...existing, definition: item.definition, isGenerating: false };
          } else {
            return {
              term: item.term || '',
              definition: item.definition || '',
              images: [],
              selectedIndex: 0,
              refinePrompt: '',
              isGenerating: false
            };
          }
        });
        this.conceptDrafts.set(updated);
      }
    } catch (e) {
      // invalid json, ignore for now
    }
  }

  // --- Core Generation Logic ---

  async brainstormTopic() {
    if (this.topicForm.invalid) return;
    this.isGeneratingContent.set(true);

    const inputs = this.topicForm.value;
    try {
      this.logger.info('Started Brainstorming', `Requesting concepts for topic: ${inputs.topic}`);
      const jsonResponse = await this.aiLogicService.brainstormTopic(inputs.topic || '', inputs.numConcepts || 5);
      
      this.editableJson = JSON.stringify(jsonResponse, null, 2);
      this.generatedContent.set(jsonResponse);
      if (jsonResponse.items && Array.isArray(jsonResponse.items)) {
        this.visualItems.set(jsonResponse.items);
      }

      // Setup empty concept drafts for UI masking
      this.conceptDrafts.set(jsonResponse.items.map((i: any) => ({
        term: i.term,
        definition: i.definition,
        images: [],
        selectedIndex: 0,
        refinePrompt: '',
        isGenerating: false
      })));
      this.saveDraft();
      this.logger.success('Brainstorm Complete', `Generated ${this.topicForm.value.numConcepts} concepts for ${this.topicForm.value?.topic}`);
      this.showToast("Topic breakdown generated successfully!", 'success');
    } catch (e: any) {
      console.error(e);
      this.showToast("Brainstorm Failed: " + e.message, 'error');
      this.logger.error('Brainstorm Failed', 'AI Generation request failed', e);
    } finally {
      this.isGeneratingContent.set(false);
    }
  }

  async brainstormMoreConcepts() {
    this.isGeneratingContent.set(true);
    try {
      const topic = this.topicForm.value?.topic || 'Untitled Topic';
      const existingTerms = this.visualItems().map(i => i.term).join(', ');

      this.logger.info('Started Brainstorming More', `Requesting additional concepts for topic: ${topic}`);

      const jsonResponse = await this.aiLogicService.brainstormMore(topic, existingTerms);

      if (jsonResponse.length > 0) {
        // Append to visual items
        this.visualItems.update(items => [...items, ...jsonResponse]);

        // Append to concept drafts
        this.conceptDrafts.update(drafts => [
          ...drafts,
          ...jsonResponse.map(i => ({
            term: i.term,
            definition: i.definition,
            images: [],
            selectedIndex: 0,
            refinePrompt: '',
            isGenerating: false
          }))
        ]);

        // Update raw JSON
        try {
          const currentJson = JSON.parse(this.editableJson);
          currentJson.items = this.visualItems();
          this.editableJson = JSON.stringify(currentJson, null, 2);
        } catch (e) { /* ignore */ }

        this.saveDraft();
        this.showToast(`Added ${jsonResponse.length} more concepts!`, 'success');
        this.logger.success('Brainstorm Complete', `Appended ${jsonResponse.length} new items to the deck.`);
      }
    } catch (e: any) {
      console.error(e);
      this.showToast("Brainstorm More Failed: " + e.message, 'error');
    } finally {
      this.isGeneratingContent.set(false);
    }
  }

  private async uploadDraftToStorage(base64Data: string): Promise<string> {
    return this.bucketService.uploadDraftImage(base64Data, 'memotattoo');
  }

  private async getAsDataUrl(imageUrl: string): Promise<string> {
    if (imageUrl.startsWith('data:')) return imageUrl;
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async onArtDirectionImageSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.isUploadingArtDirection.set(true);
    try {
      // Create local object URL for instant preview and upload in background
      const localUrl = URL.createObjectURL(file);
      this.artDirectionImage = localUrl;

      this.logger.info('Started Upload', `Uploading Art Direction Reference Image`);

      // Upload using Blob instead of Base64 to save memory
      this.artDirectionImage = await this.bucketService.uploadDraftImage(await this.getAsDataUrl(localUrl), 'art_direction');
      this.saveDraft();
      this.showToast("Reference Image uploaded and saved.", 'success');
      this.logger.success('Completed Upload', 'Uploaded Art Direction Image to Storage');
    } catch (e: any) {
      this.logger.error('Upload Failed', `Could not upload Art Direction Image`, e);
      this.showToast("Failed to upload image: " + e.message, 'error');
      this.artDirectionImage = null;
    } finally {
      this.isUploadingArtDirection.set(false);
      // Reset input value so same file can be chosen again if needed
      event.target.value = '';
    }
  }

  async onCustomConceptImageSelected(event: any, index: number) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.conceptDrafts.update(drafts => {
      const newDrafts = [...drafts];
      if (newDrafts[index]) {
        newDrafts[index].isGenerating = true;
      }
      return newDrafts;
    });

    try {
      const localUrl = URL.createObjectURL(file);
      this.logger.info('Started Upload', `Uploading Custom Concept Image for index ${index}`);

      const downloadURL = await this.bucketService.uploadDraftImage(await this.getAsDataUrl(localUrl), 'custom_concept');

      this.conceptDrafts.update(drafts => {
        const newDrafts = [...drafts];
        if (newDrafts[index]) {
          newDrafts[index].images.push(downloadURL);
          newDrafts[index].selectedIndex = newDrafts[index].images.length - 1;
        }
        return newDrafts;
      });
      this.saveDraft();
      this.showToast("Custom concept image uploaded successfully.", 'success');
      this.logger.success('Completed Upload', 'Uploaded Custom Concept Image to Storage');
    } catch (e: any) {
      this.logger.error('Upload Failed', `Could not upload Custom Concept Image`, e);
      this.showToast("Failed to upload image: " + e.message, 'error');
    } finally {
      this.conceptDrafts.update(drafts => {
        const newDrafts = [...drafts];
        if (newDrafts[index]) {
          newDrafts[index].isGenerating = false;
        }
        return newDrafts;
      });
      event.target.value = '';
    }
  }

  async generateMissingImages() {
    const drafts = this.conceptDrafts();
    for (let i = 0; i < drafts.length; i++) {
      if (drafts[i].images.length === 0) {
        await this.generateConceptImage(i);
      }
    }
  }

  isGeneratingAny(): boolean {
    return this.conceptDrafts().some(c => c.isGenerating);
  }

  canPublish(): boolean {
    const drafts = this.conceptDrafts();
    if (this.isEditingExisting()) {
      return drafts.length > 0;
    }
    return drafts.length > 0 && drafts.every(c => c.images.length > 0);
  }

  async generateConceptImage(index: number) {
    let data;
    try {
      data = JSON.parse(this.editableJson);
    } catch (e) {
      this.showToast("Invalid JSON format in the editor.", 'error');
      return;
    }

    const concept = this.conceptDrafts()[index];
    if (!concept) return;

    this.conceptDrafts.update(drafts => {
      const newDrafts = [...drafts];
      newDrafts[index] = { ...newDrafts[index], isGenerating: true };
      return newDrafts;
    });

    // Admins have unlimited generations on the web app

    try {
      this.logger.info('Started Image Generation', `Generating new artwork for concept: ${concept.term}`);
      let newImage = await this.aiLogicService.generateAndPersistConceptImage(
        concept,
        data.title || "Untitled",
        this.artDirection || "None",
        this.artDirectionImage || undefined
      );

      if (newImage) {
        this.conceptDrafts.update(drafts => {
          const newDrafts = [...drafts];
          const newImages = [...newDrafts[index].images, newImage as string];
          newDrafts[index] = {
            ...newDrafts[index],
            images: newImages,
            selectedIndex: newImages.length - 1
          };
          return newDrafts;
        });
        this.logger.success('Completed Image Generation', `Saved new artwork for ${concept.term}`);
      }
    } catch (e: any) {
      console.error("AI Image Gen Error:", e);
      this.logger.error('Image Generation Failed', `Failed while generating or saving image for ${concept.term}`, e);
      this.showToast("Failed to generate Image for " + concept.term + ": " + e.message, 'error');
    } finally {
      this.conceptDrafts.update(drafts => {
        const newDrafts = [...drafts];
        newDrafts[index] = { ...newDrafts[index], isGenerating: false };
        return newDrafts;
      });
      this.saveDraft();
    }
  }

  async refineConceptImage(index: number) {
    const concept = this.conceptDrafts()[index];
    if (!concept) return;
    const existingImage = concept.images[concept.selectedIndex];
    if (!existingImage || !concept.refinePrompt) return;

    this.conceptDrafts.update(drafts => {
      const newDrafts = [...drafts];
      newDrafts[index] = { ...newDrafts[index], isGenerating: true };
      return newDrafts;
    });

    try {
      this.logger.info('Started Image Refinement', `Refining artwork for concept: ${concept.term}`);

      let base64Image;
      try {
        let fetchUrl = existingImage;
        if (existingImage.includes('firebasestorage.googleapis.com')) {
          const urlObj = new URL(existingImage);
          fetchUrl = '/firebase-storage' + urlObj.pathname + urlObj.search;
        }
        base64Image = await this.getAsDataUrl(fetchUrl);
      } catch (e: any) {
        throw new Error(`CORS or Image Download Error: ${e.message}`);
      }

      let refinedImage = await this.aiLogicService.refineAndPersistConceptImage(concept, base64Image, concept.refinePrompt);

      if (refinedImage) {
        this.conceptDrafts.update(drafts => {
          const newDrafts = [...drafts];
          const newImages = [...newDrafts[index].images, refinedImage as string];
          newDrafts[index] = {
            ...newDrafts[index],
            images: newImages,
            selectedIndex: newImages.length - 1,
            refinePrompt: ''
          };
          return newDrafts;
        });
        this.logger.success('Completed Image Refinement', `Saved refined artwork for ${concept.term}`);
      }
    } catch (e: any) {
      console.error("AI Image Refine Error:", e);
      this.logger.error('Image Refinement Failed', `Failed while refining image for ${concept.term}`, e);
      this.showToast("Failed to refine Image for " + concept.term + ": " + e.message, 'error');
    } finally {
      this.conceptDrafts.update(drafts => {
        const newDrafts = [...drafts];
        newDrafts[index] = { ...newDrafts[index], isGenerating: false };
        return newDrafts;
      });
      this.saveDraft();
    }
  }

  selectImage(conceptIndex: number, imageIndex: number) {
    this.conceptDrafts.update(drafts => {
      const newDrafts = [...drafts];
      newDrafts[conceptIndex] = { ...newDrafts[conceptIndex], selectedIndex: imageIndex };
      return newDrafts;
    });
    this.saveDraft();
  }

  // --- Image Viewer / Zoom ---

  viewDraftImages(images: string[]) {
    this.viewingImages.set(images);
    this.viewingImageIndex.set(this.conceptDrafts().find(c => c.images === images)?.selectedIndex || 0);
  }

  closeImageViewer() {
    this.viewingImages.set([]);
  }

  nextImage(event: Event) {
    event.stopPropagation();
    const len = this.viewingImages().length;
    if (len > 0) {
      this.viewingImageIndex.update(i => (i + 1) % len);
    }
  }

  prevImage(event: Event) {
    event.stopPropagation();
    const len = this.viewingImages().length;
    if (len > 0) {
      this.viewingImageIndex.update(i => (i - 1 + len) % len);
    }
  }

  // --- Publish ---

  async saveToGlobalLibrary() {
    this.isSaving.set(true);

    try {
      let data = JSON.parse(this.editableJson);

      const drafts = this.conceptDrafts();
      for (let i = 0; i < drafts.length; i++) {
        if (data.items && data.items[i]) {
          data.items[i].imageArt = drafts[i].images[drafts[i].selectedIndex];
        }
      }

      const currentUser = this.userService.user();

      const payload = {
        topic: this.topicForm.value?.topic || 'Untitled',
        contentBase: data,
        artDirection: this.artDirection || null,
        artDirectionImage: this.artDirectionImage || null,
        publishedAt: new Date().toISOString(),
        status: this.isEditingExisting() ? this.originalStatus() : 'published',
        isPublic: this.isEditingExisting() ? this.originalIsPublic() : true,
        owner_id: this.isEditingExisting() ? (this.originalOwnerId() || null) : (currentUser?.uid || null),
        owner_email: this.isEditingExisting() ? (this.originalOwnerEmail() || null) : (currentUser?.email || null)
      };

      if (payload.status === 'private' || payload.status === 'draft') {
        payload.isPublic = false;
      }

      await this.flashcardService.saveDeck(this.activeDraftId(), this.sanitizePayload(payload));

      const verb = this.isEditingExisting() ? 'Saved' : 'Published';
      const actionMessage = this.isEditingExisting() ? 'saved changes to an existing deck' : 'published a public deck directly to the library';
      const toastMessage = this.isEditingExisting() ? 'Changes saved successfully!' : 'Flashcard published! It is now live in the global library.';

      this.logger.info(`Deck ${verb}`, `${actionMessage} titled ${this.topicForm.value.topic} directly to the library.`);
      this.showToast(toastMessage, 'success');

      // Small delay to allow the toast to be seen before redirecting
      setTimeout(() => {
        this.resetLocalState();
        this.router.navigate(['/flashcard-library']);
      }, 1500);
    } catch (err: any) {
      console.error('Error publishing deck:', err);
      this.showToast('Error publishing deck: ' + err.message, 'error');
    } finally {
      this.isSaving.set(false);
    }
  }

  private sanitizePayload(obj: any): any {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.sanitizePayload(item));
    if (obj instanceof Date) return obj;

    const sanitized: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value === undefined) {
        sanitized[key] = null;
      } else {
        sanitized[key] = this.sanitizePayload(value);
      }
    });
    return sanitized;
  }
}
