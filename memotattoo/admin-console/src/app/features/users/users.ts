import { Component, signal, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLogService } from '../../core/services/activity-log.service';
import { UserManagementService, FirebaseUser } from '../../core/services/user-management.service';
import { FormsModule } from '@angular/forms';
import { ConfirmDialogComponent, ConfirmActionParams } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  template: `
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-3xl font-bold text-slate-100 tracking-tight">User Management</h2>
      <div class="flex gap-2">
        <span class="px-3 py-1 bg-slate-800 rounded-lg text-sm font-semibold text-slate-400 border border-slate-700">Total Users: {{ users().length }}</span>
      </div>
    </div>
    
    @if (isLoading()) {
      <div class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    } @else {
      <div class="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-lg">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-900/50 border-b border-slate-700">
                <th class="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-1/4">User</th>
                <th class="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Energy Bolts</th>
                <th class="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Status</th>
                <th class="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Interests</th>
                <th class="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700/50">
              @for (user of users(); track user.id) {
                <tr class="hover:bg-slate-700/30 transition-colors group">
                  <td class="p-4">
                    <div class="text-sm font-semibold text-white">{{ user.email || 'No Email Registered' }}</div>
                    <div class="text-xs font-mono text-slate-500 truncate" [title]="user.id">UID: {{ user.id }}</div>
                  </td>
                  
                  <!-- Energy Bolts Editor -->
                  <td class="p-4 text-center">
                    <div class="flex items-center justify-center gap-2 opacity-100 lg:opacity-60 lg:group-hover:opacity-100 transition-opacity">
                      <input type="number" 
                             class="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-center text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                             [value]="user.energy_bolts"
                             #boltInput>
                      <button (click)="updateBolts(user, boltInput.value)" 
                              class="p-1.5 bg-slate-700 hover:bg-emerald-600 text-slate-300 hover:text-white rounded transition-colors"
                              title="Save Bolts">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      </button>
                    </div>
                  </td>

                  <!-- Status Badges -->
                  <td class="p-4 text-center space-y-2">
                    <div class="flex justify-center gap-2 flex-wrap">
                       @if (user.isPro) {
                         <span class="px-2 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[10px] font-bold uppercase tracking-wider">PRO</span>
                       } @else {
                         <span class="px-2 py-1 bg-slate-700/50 text-slate-400 rounded text-[10px] font-bold uppercase tracking-wider">FREE</span>
                       }
                       
                       @if (user.isBanned) {
                         <span class="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[10px] font-bold uppercase tracking-wider">BANNED</span>
                       }
                    </div>
                  </td>
                  
                  <td class="p-4 text-center text-xs text-slate-400">
                    <span class="truncate max-w-[150px] inline-block" [title]="user.interests.join(', ') || 'None'">
                      {{ user.interests.join(', ') || 'None' }}
                    </span>
                  </td>

                  <!-- Actions -->
                  <td class="p-4 text-right">
                    <div class="flex justify-end gap-2">
                        <button (click)="toggleBanStatus(user)"
                                class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border"
                                [ngClass]="{
                                  'bg-red-600/20 text-red-400 border-red-500/20 hover:bg-red-600/30': !user.isBanned,
                                  'bg-slate-600/20 text-slate-300 border-slate-500/20 hover:bg-slate-600/30': user.isBanned
                                }">
                          {{ user.isBanned ? 'PARDON' : 'BAN' }}
                        </button>
                        
                        <button (click)="deleteUser(user)"
                                class="px-2 py-1.5 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
                                title="Permanently Delete User">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- UI Confirmation Dialog -->
    <app-confirm-dialog
      [isOpen]="isDialogOpen()"
      [title]="dialogConfig().title"
      [message]="dialogConfig().message"
      [confirmText]="dialogConfig().confirmText"
      [intent]="dialogConfig().intent"
      (confirm)="executePendingAction()"
      (cancel)="cancelAction()"
    ></app-confirm-dialog>
  `
})
export class UsersComponent implements OnInit, OnDestroy {
  users = signal<FirebaseUser[]>([]);
  isLoading = signal<boolean>(true);
  private subscription: Subscription | null = null;

  // Dialog State
  isDialogOpen = signal<boolean>(false);
  dialogConfig = signal<ConfirmActionParams>({
    id: '', title: '', message: '', confirmText: 'Confirm', intent: 'danger'
  });
  private pendingAction: (() => Promise<void>) | null = null;

  private logger = inject(ActivityLogService);
  private userManagementService = inject(UserManagementService);

  ngOnInit() {
    this.subscription = this.userManagementService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error("Error subscribing to Users:", error);
        this.isLoading.set(false);
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async updateBolts(user: FirebaseUser, newValueStr: string) {
    const val = parseInt(newValueStr, 10);
    if (isNaN(val)) return;

    // Prevent meaningless writes
    if (val === user.energy_bolts) return;

    try {
      await this.userManagementService.updateBolts(user.id, val);
      this.logger.info('Economy Managed', `Modified energy bolts for UID ${user.id} from ${user.energy_bolts} to ${val}`);
    } catch (e: any) {
      this.logger.error('Economy Update Failed', `Could not update bolts for ${user.id}`, e);
      alert("Failed to update bolts: " + e.message);
    }
  }

  async toggleBanStatus(user: FirebaseUser) {
    const newStatus = !user.isBanned;
    const actionName = newStatus ? "Banned" : "Pardoned";

    this.promptConfirmation({
      id: user.id,
      title: newStatus ? 'Ban User' : 'Unban User',
      message: `Are you sure you want to ${newStatus ? 'BAN' : 'UNBAN'} user ${user.email || user.id}?`,
      confirmText: newStatus ? 'Ban User' : 'Unban User',
      intent: newStatus ? 'danger' : 'info'
    }, async () => {
      try {
        await this.userManagementService.setBanStatus(user.id, newStatus);
        this.logger.warning(`User ${actionName}`, `UID ${user.id} was ${actionName.toLowerCase()} by admin.`);
      } catch (e: any) {
        this.logger.error('Ban Toggle Failed', `Could not change ban status for ${user.id}`, e);
        alert("Failed to update ban status: " + e.message);
      }
    });
  }

  async deleteUser(user: FirebaseUser) {
    this.promptConfirmation({
      id: user.id,
      title: 'Delete User Permanently',
      message: `CRITICAL WARNING: Are you sure you want to permanently DELETE user ${user.email || user.id}? This cannot be undone.`,
      confirmText: 'Delete User',
      intent: 'danger'
    }, async () => {
      try {
        await this.userManagementService.deleteUser(user.id);
        this.logger.error('User Deleted', `UID ${user.id} was permanently deleted from the database.`);
      } catch (e: any) {
        this.logger.error('Deletion Failed', `Could not delete user ${user.id}`, e);
        alert("Failed to delete user: " + e.message);
      }
    });
  }

  private promptConfirmation(config: ConfirmActionParams, action: () => Promise<void>) {
    this.dialogConfig.set(config);
    this.pendingAction = action;
    this.isDialogOpen.set(true);
  }

  async executePendingAction() {
    if (this.pendingAction) {
      await this.pendingAction();
    }
    this.isDialogOpen.set(false);
    this.pendingAction = null;
  }

  cancelAction() {
    this.isDialogOpen.set(false);
    this.pendingAction = null;
  }
}
