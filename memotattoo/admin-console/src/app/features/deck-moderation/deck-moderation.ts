import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { collection, doc, query, updateDoc, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '../../core/firebase/firebase';
import { ConfirmDialogComponent, ConfirmActionParams } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { ResizeText } from '../../shared/directives/resize-text';

export interface PendingDeck {
  id: string;
  title: string;
  status: string;
  isPublic: boolean;
  items: {
    original: string;
    translation: string;
    image: string;
  }[];
}

@Component({
  selector: 'app-deck-moderation',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent, ResizeText],
  templateUrl: './deck-moderation.html'
})
export class DeckModeration {
  private log = inject(ActivityLogService);

  decks = signal<PendingDeck[]>([]);
  isLoading = signal(true);
  pendingAction = signal<ConfirmActionParams | null>(null);
  zoomedItem = signal<any>(null);

  constructor() {
    this.fetchPendingDecks();
  }

  fetchPendingDecks() {
    const colRef = collection(firestore, 'FlashcardDecks');
    const q = query(colRef, where('status', '==', 'pending'));

    onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PendingDeck));
      this.decks.set(data);
      this.isLoading.set(false);
    });
  }

  openZoom(item: any) {
    this.zoomedItem.set(item);
  }

  closeZoom() {
    this.zoomedItem.set(null);
  }

  promptApprove(deck: PendingDeck) {
    this.pendingAction.set({
      id: deck.id,
      title: 'Approve Public Deck',
      message: `Are you sure you want to approve "${deck.title}"? This makes it visible to all users and rewards the creator with 1 Energy Bolt per play.`,
      confirmText: 'Approve',
      intent: 'info'
    });
  }

  promptReject(deck: PendingDeck) {
    this.pendingAction.set({
      id: deck.id,
      title: 'Reject Deck',
      message: `Are you sure you want to reject "${deck.title}"? This will return it to the creator as a private draft.`,
      confirmText: 'Reject',
      intent: 'danger'
    });
  }

  async onConfirm() {
    const action = this.pendingAction();
    if (!action) return;

    const docRef = doc(firestore, `FlashcardDecks/${action.id}`);

    try {
      if (action.title === 'Approve Public Deck') {
        await updateDoc(docRef, { status: 'published', isPublic: true });
        this.log.success('Deck Approved', `Published public deck ${action.id} to the global library.`);
      } else {
        await updateDoc(docRef, { status: 'draft', isPublic: false });
        this.log.warning('Deck Rejected', `Returned public deck request for ${action.id} to private draft.`);
      }
    } catch (err) {
      this.log.error('Moderation Failed', `System failed to moderate deck ${action.id}: ${err}`);
      console.error(err);
    } finally {
      this.pendingAction.set(null);
    }
  }

  onCancel() {
    this.pendingAction.set(null);
  }
}
