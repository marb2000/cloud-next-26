import { Component, signal, OnInit, OnDestroy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLog, LogIntent, ActivityLogService } from '../../core/services/activity-log.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, ConfirmDialogComponent],
  template: `
    <div class="flex items-center justify-between mb-8">
      <h2 class="text-3xl font-bold text-slate-100 tracking-tight">Activity Logs</h2>
      
      <div class="flex items-center gap-4">
        <!-- Timeframe Filter -->
        <div class="flex gap-2 bg-slate-800 rounded-lg p-1 border border-slate-700">
           <button 
             *ngFor="let tf of timeframes" 
             class="px-4 py-1.5 text-xs font-bold rounded-md transition-colors"
             [ngClass]="{
                'bg-slate-700 text-white shadow': activeTimeframe() === tf.value,
                'text-slate-400 hover:text-slate-200': activeTimeframe() !== tf.value
             }"
             (click)="activeTimeframe.set(tf.value)"
           >
             {{ tf.label }}
           </button>
        </div>
      
        <!-- Intent Filter -->
        <div class="flex gap-2 bg-slate-800 rounded-lg p-1 border border-slate-700">
          <button 
            *ngFor="let filter of filters" 
            class="px-4 py-1.5 text-xs font-bold rounded-md transition-colors"
            [ngClass]="{
               'bg-slate-700 text-white shadow': activeFilter() === filter.value,
               'text-slate-400 hover:text-slate-200': activeFilter() !== filter.value
            }"
            (click)="activeFilter.set(filter.value)"
          >
            {{ filter.label }}
          </button>
        </div>
        
        <!-- Drop Logs Button -->
        <button 
          (click)="showDropConfirm.set(true)"
          class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-bold border border-red-500/30 transition-colors"
        >
          Drop Logs
        </button>
      </div>
    </div>
    
    <div class="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[75vh]">
      <!-- Header Row -->
      <div class="grid grid-cols-12 gap-4 p-4 border-b border-slate-700/80 bg-slate-900/50 text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-0">
        <div class="col-span-2">Timestamp</div>
        <div class="col-span-1 text-center">Intent</div>
        <div class="col-span-3">Action</div>
        <div class="col-span-6">Description / Metadata</div>
      </div>
      
      <!-- Log Stream body -->
      <div class="flex-grow overflow-auto p-2 scroll-smooth">
        @if (isLoading()) {
          <div class="flex justify-center items-center py-20">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-500"></div>
          </div>
        } @else if (filteredLogs().length === 0) {
          <div class="text-center py-20">
            <p class="text-slate-500 font-mono text-sm">No activity logs found for the selected filter.</p>
          </div>
        } @else {
          <div class="space-y-1">
             @for (log of filteredLogs(); track log.id) {
                <div class="grid grid-cols-12 gap-4 p-3 rounded-xl hover:bg-slate-700/30 transition-colors border border-transparent hover:border-slate-600/50 group items-start">
                  
                  <!-- Timestamp -->
                  <div class="col-span-2 text-xs text-slate-500 font-mono flex items-center h-full">
                     {{ log.timestamp | date:'MMM d, HH:mm:ss' }}
                  </div>
                  
                  <!-- Badge -->
                  <div class="col-span-1 flex justify-center items-center h-full">
                     <span class="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                           [ngClass]="{
                              'bg-green-500 shadow-green-500/50': log.intent === 'success',
                              'bg-blue-500 shadow-blue-500/50': log.intent === 'info',
                              'bg-yellow-500 shadow-yellow-500/50': log.intent === 'warning',
                              'bg-red-500 shadow-red-500/50 animate-pulse': log.intent === 'error'
                           }">
                     </span>
                  </div>
                  
                  <!-- Action -->
                  <div class="col-span-3 text-sm font-semibold text-slate-200">
                     {{ log.action }}
                  </div>
                  
                  <!-- Description & Metadata -->
                  <div class="col-span-6 flex flex-col gap-1">
                     <span class="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                        {{ log.description }}
                     </span>
                     @if (log.metadata) {
                        <pre class="mt-2 text-[10px] sm:text-xs text-teal-400/80 bg-slate-950 p-2 rounded-lg border border-slate-800 overflow-x-auto font-mono max-h-32 overflow-y-auto w-full">{{ log.metadata | json }}</pre>
                     }
                  </div>
                </div>
             }
          </div>
        }
      </div>
    </div>
    
    <app-confirm-dialog
      [isOpen]="showDropConfirm()"
      title="Drop Activity Logs"
      message="Are you sure you want to permanently delete all activity logs? This action cannot be undone."
      confirmText="Drop Logs"
      cancelText="Cancel"
      intent="danger"
      (confirm)="dropAllLogs()"
      (cancel)="showDropConfirm.set(false)"
    ></app-confirm-dialog>
  `
})
export class LogsComponent implements OnInit, OnDestroy {
  logs = signal<(ActivityLog & { id: string })[]>([]);
  isLoading = signal<boolean>(true);
  showDropConfirm = signal<boolean>(false);

  // Filtering logic
  activeFilter = signal<'all' | 'errors' | 'success' | 'info'>('all');
  activeTimeframe = signal<'today' | 'week' | 'all'>('all');

  filters: { label: string, value: 'all' | 'errors' | 'success' | 'info' }[] = [
    { label: 'All Events', value: 'all' },
    { label: 'Success', value: 'success' },
    { label: 'Info', value: 'info' },
    { label: 'Errors', value: 'errors' }
  ];

  timeframes: { label: string, value: 'today' | 'week' | 'all' }[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'All', value: 'all' }
  ];

  filteredLogs = computed(() => {
    let result = this.logs();

    // Apply Timeframe Filter
    const tf = this.activeTimeframe();
    if (tf !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (tf === 'today') {
        cutoff.setHours(0, 0, 0, 0); // Start of today
      } else if (tf === 'week') {
        cutoff.setDate(now.getDate() - 7); // 7 days ago
      }

      result = result.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= cutoff;
      });
    }

    // Apply Intent Filter
    const filter = this.activeFilter();
    if (filter === 'errors') {
      result = result.filter(l => l.intent === 'error');
    } else if (filter !== 'all') {
      result = result.filter(l => l.intent === filter);
    }

    return result;
  });

  private logService = inject(ActivityLogService);
  private subscription: Subscription | null = null;

  ngOnInit() {
    this.isLoading.set(true);
    this.subscription = this.logService.getLogs(150).subscribe({
      next: (data) => {
        this.logs.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error("Failed to subscribe to Activity Logs:", error);
        this.isLoading.set(false);
      }
    });
  }

  async dropAllLogs() {
    this.showDropConfirm.set(false);
    this.isLoading.set(true);

    try {
      const numDeleted = await this.logService.dropLogs();
      console.log(`Successfully dropped ${numDeleted} Activity Logs.`);
      // The Observable will automatically update since the collection is now empty.
    } catch (err: any) {
      console.error("Failed to drop Activity Logs:", err);
      alert("Failed to drop logs: " + err.message);
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    if (this.subscription) this.subscription.unsubscribe();
  }
}
