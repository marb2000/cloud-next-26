import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center">
      <!-- Backdrop Blurs -->
      <div 
        class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        (click)="onCancel()"
      ></div>

      <!-- Modal Content -->
      <div 
        class="relative bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl p-6 w-full max-w-md transform transition-all flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200"
        [ngClass]="{
          'shadow-red-500/10 border-red-500/30': intent === 'danger',
          'shadow-blue-500/10 border-blue-500/30': intent === 'info'
        }"
      >
        <!-- Icon Area -->
        <div 
          class="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          [ngClass]="{
            'bg-red-500/10 text-red-500': intent === 'danger',
            'bg-blue-500/10 text-blue-500': intent === 'info'
          }"
        >
          <ng-container *ngIf="intent === 'danger'">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </ng-container>
          <ng-container *ngIf="intent === 'info'">
             <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </ng-container>
        </div>

        <h3 class="text-xl font-bold text-slate-100 mb-2">{{ title }}</h3>
        <p class="text-slate-400 text-sm mb-6">{{ message }}</p>

        <div class="flex items-center justify-center w-full space-x-4">
          <button 
            (click)="onCancel()"
            class="px-5 py-2.5 rounded-xl font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors focus:ring-2 focus:ring-slate-500 focus:outline-none w-1/2"
          >
            {{ cancelText }}
          </button>
          <button 
            (click)="onConfirm()"
            class="px-5 py-2.5 rounded-xl font-semibold text-white transition-colors focus:ring-2 focus:outline-none w-1/2"
            [ngClass]="{
              'bg-red-600 hover:bg-red-500 focus:ring-red-500': intent === 'danger',
              'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500': intent === 'info'
            }"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  @Input() isOpen: boolean = false;
  @Input() title: string = 'Confirm Action';
  @Input() message: string = 'Are you sure you want to proceed?';
  @Input() confirmText: string = 'Confirm';
  @Input() cancelText: string = 'Cancel';
  @Input() intent: 'danger' | 'info' = 'danger';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
}

export interface ConfirmActionParams {
  id: string;
  title: string;
  message: string;
  confirmText: string;
  intent: 'danger' | 'info';
}
