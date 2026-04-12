import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { FlashcardService, FlashcardDeck } from '../../core/services/flashcard.service';
import { UserManagementService, FirebaseUser } from '../../core/services/user-management.service';

@Component({
  selector: 'app-flashcard-library',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  template: `
    <div class="p-8">
      <h1 class="text-3xl font-bold text-white mb-6">Deck Library</h1>
      <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-4">
        <div class="relative">
          <input type="text" 
                 [value]="searchQuery()" 
                 (input)="searchQuery.set($any($event.target).value)"
                 placeholder="Search decks..." 
                 class="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors w-64">
          <svg class="w-4 h-4 text-slate-500 absolute right-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <button (click)="showPrivateDecks.set(!showPrivateDecks())" 
                class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors border"
                [ngClass]="showPrivateDecks() ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'">
          {{ showPrivateDecks() ? 'Showing Private' : 'Private Hidden' }}
        </button>
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
            <div class="h-64 w-full bg-slate-950 relative p-2 cursor-pointer group" (click)="deck.previewImages.length > 0 && openImageViewer(deck, 0)">
              @if (deck.previewImages && deck.previewImages.length === 1) {
                <img [src]="deck.previewImages[0]" class="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]">
              } @else if (deck.previewImages && deck.previewImages.length > 1) {
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
                        'bg-indigo-500/90 text-indigo-100 border border-indigo-500': deck.status === 'private',
                        'bg-red-500/90 text-red-950 border border-red-500': deck.status === 'locked'
                      }">
                  {{ (deck.status || 'draft') | uppercase }}
                </span>
              </div>
            </div>
            
            <!-- Cards Content -->
            <div class="p-6 flex flex-col flex-grow">
              <h3 class="text-xl font-bold text-white mb-1 line-clamp-1" [title]="deck.topic">{{ deck.topic || 'Untitled Deck' }}</h3>
              <span class="text-xs text-indigo-400 font-mono line-clamp-1 block mb-2">{{ getOwnerLabel(deck) }}</span>
              <p class="text-[10px] text-slate-500 mb-6 font-mono uppercase tracking-wider">{{ deck.publishedAt | date:'medium' }}</p>
              
              <div class="mt-auto space-y-4">
                <!-- Primary & Secondary Actions -->
                <div class="flex gap-3 items-center">
                  <button class="flex-grow py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                          [disabled]="deck.status === 'locked' || (deck.previewImages.length === 0 && (!deck.items || deck.items.length === 0))" (click)="playDeck(deck)">
                    <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"></path>
                    </svg>
                    Play
                  </button>
                  <button class="flex-grow py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm rounded-lg transition-colors border border-slate-600 disabled:opacity-50 flex items-center justify-center gap-2"
                          [disabled]="deck.status === 'locked'" (click)="editDeck(deck)">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    Edit
                  </button>
                  
                  <!-- More Actions Dropdown -->
                  <div class="relative group">
                    <button class="p-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
                      </svg>
                    </button>
                    
                    <!-- Dropdown Menu -->
                    <div class="absolute right-0 bottom-full mb-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      <div class="py-1">
                        <button (click)="openQuickEdit(deck)" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4m-4-4L6 20"></path></svg>
                          View JSON
                        </button>
                        
                        <div class="border-t border-slate-700 my-1"></div>
                        
                        <!-- Status Actions -->
                        @if (deck.status !== 'locked') {
                          <button (click)="executeStatusUpdate(deck.id, 'draft')" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full" [class.bg-emerald-400]="deck.status === 'draft'" [class.bg-slate-600]="deck.status !== 'draft'"></div>
                            Set as Draft
                          </button>
                          <button (click)="executeStatusUpdate(deck.id, 'published')" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full" [class.bg-emerald-400]="deck.status === 'published'" [class.bg-slate-600]="deck.status !== 'published'"></div>
                            Set as Published
                          </button>
                          <button (click)="executeStatusUpdate(deck.id, 'private')" class="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full" [class.bg-emerald-400]="deck.status === 'private'" [class.bg-slate-600]="deck.status !== 'private'"></div>
                            Set as Private
                          </button>
                          <button (click)="executeStatusUpdate(deck.id, 'locked')" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            Lock Deck
                          </button>
                        } @else {
                          <button (click)="promptUnlockDeck(deck.id)" class="w-full text-left px-4 py-2 text-sm text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 flex items-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0v4m0 0a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2m10 0V7a4 4 0 00-8 0v4h8z"></path></svg>
                            Unlock Deck
                          </button>
                        }
                        
                        <div class="border-t border-slate-700 my-1"></div>
                        
                        <button (click)="promptDeleteDeck(deck.id)" class="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 flex items-center gap-2">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          Delete Deck
                        </button>
                      </div>
                    </div>
                  </div>
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
    </div>
  `
})
export class FlashcardLibrary implements OnInit {

  users = signal<FirebaseUser[]>([]);
  decks = signal<FlashcardDeck[]>([]);
  searchQuery = signal<string>('');
  showPrivateDecks = signal<boolean>(false);
  filteredDecks = computed(() => {
    let decks = this.decks();
    if (!this.showPrivateDecks()) {
      decks = decks.filter(d => d.status !== 'private');
    }
    const query = this.searchQuery().toLowerCase();
    if (query) {
      decks = decks.filter(d => d.topic.toLowerCase().includes(query));
    }
    return decks;
  });
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

  private logger = inject(ActivityLogService);
  private router = inject(Router);
  private flashcardService = inject(FlashcardService);
  private userManagementService = inject(UserManagementService);

  ngOnInit() {
    this.flashcardService.getDecks().subscribe(decks => {
      this.decks.set(decks);
      this.isLoading.set(false);
    });

    this.userManagementService.getUsers().subscribe(users => {
      this.users.set(users);
    });
  }

  getOwnerLabel(deck: FlashcardDeck): string {
    const idSuffix = deck.owner_id ? ` (${deck.owner_id.substring(0, 8)}...)` : '';
    
    if (deck.owner_email) return 'By: ' + deck.owner_email + idSuffix;
    if (deck.owner_id) {
      const user = this.users().find(u => u.id === deck.owner_id);
      if (user?.email) return 'By: ' + user.email + idSuffix;
      return 'By User ID: ' + deck.owner_id;
    }
    return 'System Deck';
  }

  async executeStatusUpdate(id: string, newStatus: string) {
    try {
      await this.flashcardService.updateStatus(id, newStatus);
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
    const hasImages = (deck.previewImages && deck.previewImages.length > 0) || 
                      (deck.items && deck.items.some((i: any) => i.imageArt || i.image));
    if (deck.status !== 'locked' && hasImages) {
      this.router.navigate(['/game', deck.id]);
    } else if (!hasImages) {
      alert("This deck doesn't have any images yet. Generate some in the Studio first!");
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

    // Reset state to close the dialog immediately
    this.pendingAction.set(null);

    // Execute the appropriate action based on the state variable
    if (action.type === 'delete') {
      try {
        await this.flashcardService.deleteDeck(action.id);
        this.logger.info('Deleted Deck', `Permanently deleted library deck ${action.id}`);
      } catch (e: any) {
        this.logger.error('Delete Deck Failed', `Failed to delete library deck ${action.id}`, e);
        alert("Deletion failed: " + e.message);
      }
    } else if (action.type === 'unlock') {
      try {
        await this.flashcardService.updateStatus(action.id, 'draft');
        this.logger.warning('Unlocked Deck', `Unlocked library deck ${action.id} to Draft status`);
      } catch (e: any) {
        this.logger.error('Unlock Deck Failed', `Failed to unlock library deck ${action.id}`, e);
        alert("Status update failed: " + e.message);
      }
    }
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

    let resolvedOwnerEmail = deck.owner_email || '';
    if (!resolvedOwnerEmail && deck.owner_id) {
      const user = this.users().find(u => u.id === deck.owner_id);
      if (user?.email) resolvedOwnerEmail = user.email;
    }

    const draftData = {
      activeDraftId: deck.id,
      isEditingExisting: true,
      formValue: { topic: deck.topic || editableJsonObj.title, numConcepts: items.length || 5 },
      editableJson: JSON.stringify(editableJsonObj, null, 2),
      artDirection: deck.artDirection || '',
      artDirectionImage: deck.artDirectionImage || null,
      originalStatus: deck.status || 'draft',
      originalIsPublic: deck.status === 'published',
      originalOwnerId: deck.owner_id || '',
      originalOwnerEmail: resolvedOwnerEmail,
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
