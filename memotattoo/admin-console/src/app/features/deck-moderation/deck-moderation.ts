import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogComponent, ConfirmActionParams } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { ModerationService, PendingDeck } from '../../core/services/moderation.service';
import { ResizeText } from '../../shared/directives/resize-text';

@Component({
  selector: 'app-deck-moderation',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent, ResizeText],
  templateUrl: './deck-moderation.html'
})
export class DeckModeration {
  private log = inject(ActivityLogService);
  private moderationService = inject(ModerationService);

  decks = signal<PendingDeck[]>([]);
  isLoading = signal(true);
  pendingAction = signal<ConfirmActionParams | null>(null);
  zoomedItem = signal<any>(null);

  constructor() {
    this.fetchPendingDecks();
  }

  fetchPendingDecks() {
    this.moderationService.getPendingDecks().subscribe(decks => {
      this.decks.set(decks);
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

    try {
      if (action.title === 'Approve Public Deck') {
        await this.moderationService.approveDeck(action.id);
        this.log.success('Deck Approved', `Published public deck ${action.id} to the global library.`);
      } else {
        await this.moderationService.rejectDeck(action.id);
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
