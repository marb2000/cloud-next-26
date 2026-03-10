import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firestore } from '../../core/firebase/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActivityLogService } from '../../core/services/activity-log.service';

interface FlashcardDeck {
  id: string;
  topic: string;
  previewImages: string[];
  publishedAt: string;
  status: 'draft' | 'published' | 'unpublished' | 'locked' | 'pending' | 'private';
  owner_email?: string;
  items?: any[];
  contentBase: any;
}

@Component({
  selector: 'app-flashcard-library',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  template: `
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <h2 class="text-3xl font-bold text-slate-100 tracking-tight">Flashcard Library</h2>
        <button (click)="showPrivateDecks.set(!showPrivateDecks())" 
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border"
                [ngClass]="showPrivateDecks() ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'">
          {{ showPrivateDecks() ? 'Showing Private' : 'Private Hidden' }}
        </button>
      </div>
      <div class="flex gap-2">
        <span class="px-3 py-1 bg-slate-800 rounded-lg text-sm font-semibold text-slate-400 border border-slate-700">Total: {{ filteredDecks().length }}</span>
      </div>
    </div>
    
    @if (isLoading()) {
      <div class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    } @else if (filteredDecks().length === 0) {
      <div class="text-center py-20 bg-slate-800/50 rounded-2xl border border-slate-700 border-dashed">
        <p class="text-slate-400">No flashcards found. Create one in the Flashcard Deck Studio!</p>
      </div>
    } @else {
      <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        @for (deck of filteredDecks(); track deck.id) {
          <div class="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg flex flex-col transition-all hover:border-slate-500 hover:shadow-xl">
            <!-- Header Image -->
            <div class="h-64 w-full bg-slate-950 relative p-2 cursor-pointer group" (click)="deck.previewImages.length && openImageViewer(deck, 0)">
              @if (deck.previewImages.length === 1) {
                <img [src]="deck.previewImages[0]" class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]">
              } @else if (deck.previewImages.length > 1) {
                <div class="w-full h-full grid gap-1 relative overflow-hidden" [ngClass]="{
                   'grid-cols-2': deck.previewImages.length === 2,
                   'grid-cols-2 grid-rows-2': deck.previewImages.length > 2
                }">
                    @for (img of deck.previewImages.slice(0, 4); track $index) {
                       <img [src]="img" class="w-full h-full object-cover rounded-md transition-transform duration-300 group-hover:scale-[1.02]">
                    }
                    @if (deck.previewImages.length > 4) {
                       <div class="absolute bottom-2 right-2 bg-slate-900/90 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">+{{ deck.previewImages.length - 4 }}</div>
                    }
                </div>
              } @else {
                <div class="w-full h-full flex items-center justify-center">
                  <span class="text-slate-600 font-medium">No Artist Image Reference</span>
                </div>
              }
              
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-20 rounded-t-2xl">
                 <svg class="w-10 h-10 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
              </div>
              
              <!-- Status Badge -->
              <div class="absolute top-4 right-4 pointer-events-none z-30">
                <span class="px-3 py-1 text-xs font-bold rounded-full shadow-lg"
                      [ngClass]="{
                        'bg-yellow-500/90 text-yellow-950 border border-yellow-500': deck.status === 'draft',
                        'bg-emerald-500/90 text-emerald-950 border border-emerald-500': deck.status === 'published',
                        'bg-slate-500/90 text-slate-100 border border-slate-500': deck.status === 'unpublished',
                        'bg-red-500/90 text-red-950 border border-red-500': deck.status === 'locked'
                      }">
                  {{ (deck.status || 'draft') | uppercase }}
                </span>
              </div>
            </div>
            
            <!-- Cards Content -->
            <div class="p-6 flex flex-col flex-grow">
              <h3 class="text-xl font-bold text-white mb-1 line-clamp-1" [title]="deck.topic">{{ deck.topic || 'Untitled Deck' }}</h3>
              <span class="text-xs text-indigo-400 font-mono line-clamp-1 block mb-2">{{ deck.owner_email ? 'By: ' + deck.owner_email : 'System Deck' }}</span>
              <p class="text-[10px] text-slate-500 mb-6 font-mono uppercase tracking-wider">{{ deck.publishedAt | date:'medium' }}</p>
              
              <div class="mt-auto space-y-4">
                <!-- Status Switcher Actions -->
                @if (deck.status !== 'locked') {
                  <div class="flex bg-slate-900 rounded-lg p-1 border border-slate-700 mb-4">
                    <button class="flex-1 py-1.5 text-xs font-semibold rounded transition-colors"
                            [class.bg-yellow-500]="deck.status === 'draft'" [class.text-white]="deck.status === 'draft'" [class.text-slate-400]="deck.status !== 'draft'"
                            (click)="executeStatusUpdate(deck.id, 'draft')">Draft</button>
                    <button class="flex-1 py-1.5 text-xs font-semibold rounded transition-colors"
                            [class.bg-emerald-500]="deck.status === 'published'" [class.text-white]="deck.status === 'published'" [class.text-slate-400]="deck.status !== 'published'"
                            (click)="executeStatusUpdate(deck.id, 'published')">Pub</button>
                    <button class="flex-1 py-1.5 text-xs font-semibold rounded transition-colors"
                            [class.bg-slate-700]="deck.status === 'unpublished'" [class.text-white]="deck.status === 'unpublished'" [class.text-slate-400]="deck.status !== 'unpublished'"
                            (click)="executeStatusUpdate(deck.id, 'unpublished')">Unpub</button>
                    <button class="flex-1 py-1.5 text-xs font-semibold rounded transition-colors text-red-400 hover:text-red-300"
                            (click)="executeStatusUpdate(deck.id, 'locked')">Lock</button>
                  </div>
                } @else {
                  <div class="mb-4 text-center">
                    <button class="w-full py-2 bg-red-500/10 text-red-500 rounded-lg text-sm font-semibold border border-red-500/20 hover:bg-red-500/20"
                            (click)="promptUnlockDeck(deck.id)">
                      Unlock Deck
                    </button>
                  </div>
                }
                
                <!-- Destructive / Edit Actions -->
                <div class="flex gap-2">
                  <button class="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold text-sm rounded-lg transition-colors border border-emerald-500/20 disabled:opacity-50"
                          [disabled]="deck.status === 'locked' || deck.previewImages.length === 0" (click)="playDeck(deck)">
                    Play
                  </button>
                  <button class="flex-1 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold text-sm rounded-lg transition-colors border border-blue-500/20 disabled:opacity-50"
                          [disabled]="deck.status === 'locked'" (click)="editDeck(deck)">
                    Edit
                  </button>
                  <button class="flex-1 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 font-bold text-sm rounded-lg transition-colors border border-purple-500/20 disabled:opacity-50"
                          [disabled]="deck.status === 'locked'" (click)="openQuickEdit(deck)">
                    JSON
                  </button>
                  <button class="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold text-sm rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
                          [disabled]="deck.status === 'locked'" (click)="promptDeleteDeck(deck.id)">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    }

    <!-- Quick Edit JSON Modal Overlay -->
    @if (editingDeck()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in-up">
        <div class="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[80vh]">
          <div class="p-6 border-b border-slate-700 flex justify-between items-center">
            <h3 class="text-xl font-bold text-white">JSON Review: {{ editingDeck()?.topic }}</h3>
            <button (click)="editingDeck.set(null)" class="text-slate-400 hover:text-white">&times; Close</button>
          </div>
          <div class="p-6 flex-grow overflow-auto">
            <pre class="text-sm font-mono text-teal-400 whitespace-pre-wrap">{{ editingDeck()?.contentBase | json }}</pre>
          </div>
        </div>
      </div>
    }

    <!-- Image Viewer Modal Overlay -->
    @if (viewingItems().length > 0) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 animate-fade-in-up">
        <!-- Close Button (Positioned relative to viewport) -->
        <button (click)="closeImageViewer()" class="absolute top-6 right-6 text-slate-400 hover:text-white bg-slate-800 rounded-full p-3 shadow-lg z-50 transition-colors outline-none cursor-pointer">
           <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>

        <div class="relative w-full h-full flex flex-col items-center justify-center max-w-[95vw] lg:max-w-7xl pb-16">
            <div class="flex items-center gap-4 w-full justify-center" style="height: calc(100vh - 160px);">
                @if (viewingItems().length > 1) {
                  <button (click)="prevImage($event)" class="text-white bg-slate-800/50 hover:bg-slate-700 p-3 rounded-full z-50 transition-colors shrink-0">
                     <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                  </button>
                }
                
                <img [src]="viewingItems()[viewingImageIndex()].image" class="max-w-[85%] max-h-full object-contain rounded-xl shadow-2xl border border-slate-700 pointer-events-auto">
                
                @if (viewingItems().length > 1) {
                  <button (click)="nextImage($event)" class="text-white bg-slate-800/50 hover:bg-slate-700 p-3 rounded-full z-50 transition-colors shrink-0">
                     <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                }
            </div>
            
            <!-- Caption below image -->
            <div class="mt-4 text-center max-w-2xl text-white pointer-events-auto pb-8">
              <h2 class="text-2xl font-bold mb-2">{{ viewingItems()[viewingImageIndex()].original }}</h2>
              <p class="text-lg text-slate-300">{{ viewingItems()[viewingImageIndex()].translation }}</p>
            </div>

            @if (viewingItems().length > 1) {
               <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/80 px-4 py-2 rounded-full text-white font-bold text-sm pointer-events-auto">
                  {{ viewingImageIndex() + 1 }} / {{ viewingItems().length }}
               </div>
            }
        </div>
      </div>
    }

    <!-- Custom Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="pendingAction() !== null"
      [title]="pendingAction()?.title || ''"
      [message]="pendingAction()?.message || ''"
      [confirmText]="pendingAction()?.confirmText || 'Confirm'"
      cancelText="Cancel"
      [intent]="pendingAction()?.intent || 'danger'"
      (confirm)="handleConfirmAction()"
      (cancel)="pendingAction.set(null)"
    ></app-confirm-dialog>
  `
})
export class FlashcardLibrary implements OnInit {
  decks = signal<FlashcardDeck[]>([]);
  showPrivateDecks = signal<boolean>(false);
  filteredDecks = computed(() => this.decks().filter(d => this.showPrivateDecks() || d.status !== 'private'));
  isLoading = signal<boolean>(true);
  editingDeck = signal<FlashcardDeck | null>(null);

  viewingItems = signal<any[]>([]);
  viewingImageIndex = signal<number>(0);

  // Generic state for custom confirmation dialogs
  pendingAction = signal<{
    type: 'delete' | 'unlock';
    id: string;
    title: string;
    message: string;
    intent: 'danger' | 'info';
    confirmText: string;
  } | null>(null);

  constructor(private logger: ActivityLogService, private router: Router) { }

  ngOnInit() {
    const q = query(collection(firestore, 'FlashcardDecks'));
    onSnapshot(q, (snap) => {
      const data: FlashcardDeck[] = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();

        const items = d['items'] || d['contentBase']?.items || [];
        const previewImages = items
          .map((item: any) => item.image || item.imageArt)
          .filter((url: string) => !!url);

        data.push({
          id: docSnap.id,
          topic: d['topic'],
          owner_email: d['owner_email'],
          previewImages: previewImages,
          publishedAt: d['publishedAt'],
          status: d['status'] || 'draft',
          contentBase: d['contentBase'] || { items }
        });
      });
      data.sort((a, b) => {
        const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return timeB - timeA;
      });
      this.decks.set(data);
      this.isLoading.set(false);
    }, (error) => {
      console.error("Error subscribing to Library:", error);
      this.isLoading.set(false);
    });
  }

  async executeStatusUpdate(id: string, newStatus: string) {
    try {
      await updateDoc(doc(firestore, 'FlashcardDecks', id), { status: newStatus });
      this.logger.info('Status Updated', `Changed library deck ${id} status to ${newStatus}`);
    } catch (e: any) {
      this.logger.error('Status Update Failed', `Failed to update deck ${id} status to ${newStatus}`, e);
      alert("Status update failed: " + e.message);
    }
  }

  promptUnlockDeck(id: string) {
    this.pendingAction.set({
      type: 'unlock',
      id: id,
      title: 'Unlock Flashcard Deck',
      message: 'This deck is locked. Unlocking it will allow editors to modify its contents and publish changes. Are you sure you want to unlock it?',
      intent: 'info',
      confirmText: 'Unlock'
    });
  }

  playDeck(deck: any) {
    if (deck.status !== 'locked' && deck.previewImages.length > 0) {
      this.router.navigate(['/game', deck.id]);
    }
  }

  promptDeleteDeck(id: string) {
    this.pendingAction.set({
      type: 'delete',
      id: id,
      title: 'Permanently Delete Flashcard Deck',
      message: 'Are you sure you want to permanently delete this deck? This action cannot be undone.',
      intent: 'danger',
      confirmText: 'Delete'
    });
  }

  async handleConfirmAction() {
    const action = this.pendingAction();
    if (!action) return;

    // Execute the appropriate action based on the state variable
    if (action.type === 'delete') {
      try {
        await deleteDoc(doc(firestore, 'FlashcardDecks', action.id));
        this.logger.info('Deleted Deck', `Permanently deleted library deck ${action.id}`);
      } catch (e: any) {
        this.logger.error('Delete Deck Failed', `Failed to delete library deck ${action.id}`, e);
        alert("Deletion failed: " + e.message);
      }
    } else if (action.type === 'unlock') {
      try {
        await updateDoc(doc(firestore, 'FlashcardDecks', action.id), { status: 'draft' });
        this.logger.warning('Unlocked Deck', `Unlocked library deck ${action.id} to Draft status`);
      } catch (e: any) {
        this.logger.error('Unlock Deck Failed', `Failed to unlock library deck ${action.id}`, e);
        alert("Status update failed: " + e.message);
      }
    }

    // Reset state to close the dialog
    this.pendingAction.set(null);
  }

  openQuickEdit(deck: FlashcardDeck) {
    this.editingDeck.set(deck);
  }

  editDeck(deck: FlashcardDeck) {
    const items = deck.contentBase?.items || deck.items || [];
    const drafts = items.map((item: any) => ({
      term: item.term || item.original || item.caption || '',
      definition: item.definition || item.translation || item.description || '',
      images: (item.imageArt || item.image) ? [item.imageArt || item.image] : [],
      selectedIndex: 0,
      refinePrompt: '',
      isGenerating: false
    }));

    // Reconstruct a valid contentBase for the Studio's JSON Editor
    const editableJsonObj = deck.contentBase || {
      title: deck.topic || deck.contentBase?.title || 'Imported Deck',
      items: items.map((item: any) => ({
        term: item.term || item.original || item.caption || '',
        definition: item.definition || item.translation || item.description || '',
        imageArt: item.imageArt || item.image || null
      }))
    };

    const draftData = {
      activeDraftId: deck.id,
      isEditingExisting: true,
      formValue: { topic: deck.topic || editableJsonObj.title, numConcepts: items.length || 5 },
      editableJson: JSON.stringify(editableJsonObj, null, 2),
      artDirection: '',
      conceptDrafts: drafts
    };

    localStorage.setItem('memotattoo_flashcard_draft', JSON.stringify(draftData));
    this.logger.info('Edit Deck', `Loading library deck ${deck.id} into Flashcard Deck Studio`);
    this.router.navigate(['/flashcard-studio']);
  }

  openImageViewer(deck: FlashcardDeck, index: number) {
    const items = deck.contentBase?.items || deck.items || [];
    const viewerItems = items.map((item: any) => ({
      image: item.imageArt || item.image || '',
      original: item.caption || item.original || item.term || '',
      translation: item.description || item.translation || item.definition || ''
    }));
    this.viewingItems.set(viewerItems);
    this.viewingImageIndex.set(index);
  }

  closeImageViewer() {
    this.viewingItems.set([]);
    this.viewingImageIndex.set(0);
  }

  nextImage(event: Event) {
    event.stopPropagation();
    const imgs = this.viewingItems();
    if (this.viewingImageIndex() < imgs.length - 1) {
      this.viewingImageIndex.update(i => i + 1);
    } else {
      this.viewingImageIndex.set(0);
    }
  }

  prevImage(event: Event) {
    event.stopPropagation();
    const imgs = this.viewingItems();
    if (this.viewingImageIndex() > 0) {
      this.viewingImageIndex.update(i => i - 1);
    } else {
      this.viewingImageIndex.set(imgs.length - 1);
    }
  }
}
