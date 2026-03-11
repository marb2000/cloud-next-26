import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2 class="text-3xl font-bold text-slate-100 mb-8 tracking-tight">Business Intelligence Dashboard</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <!-- Total Users -->
      <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <p class="text-slate-400 font-semibold mb-1">Total Users</p>
        <p class="text-4xl font-black text-white">{{ usersCount() }}</p>
        <p class="text-blue-400 text-sm mt-3 font-semibold">{{ proUsersCount() }} Pro Subscribers</p>
      </div>
      <!-- AI Images -->
      <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <p class="text-slate-400 font-semibold mb-1">Images Generated (30 Days)</p>
        <p class="text-4xl font-black text-emerald-400">{{ totalImagesGenerated() }}</p>
        <p class="text-slate-400 text-sm mt-3 font-semibold">Across all Users</p>
      </div>

      <!-- AI Tokens -->
      <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <p class="text-slate-400 font-semibold mb-1">Tokens Consumed (30 Days)</p>
        <p class="text-4xl font-black text-pink-400">{{ totalTokensConsumed() | number }}</p>
        <p class="text-slate-400 text-sm mt-3 font-semibold">Gemini Flash Models</p>
      </div>
      
      <!-- Generated Content -->
      <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <p class="text-slate-400 font-semibold mb-1">Flashcard Decks</p>
        <p class="text-4xl font-black text-white">{{ decksCount() }}</p>
        <p class="text-emerald-400 text-sm mt-3 font-semibold">Community Content</p>
      </div>
    </div>
    
    <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg">
      <h3 class="text-xl font-bold text-slate-100 mb-4">Top Trending Decks</h3>
      <div class="space-y-3">
        <div *ngFor="let deck of topDecks()" class="flex items-center gap-4 py-3 border-b border-slate-700/50">
          <div class="h-2 w-2 rounded-full bg-emerald-400"></div>
          <span class="text-slate-300 font-mono text-sm truncate flex-1">{{ deck.title || 'Untitled Deck' }}</span>
          <span class="text-slate-400 text-sm w-32 truncate">{{ deck.topic }}</span>
          <span class="text-emerald-400 font-bold ml-auto min-w-[60px] text-right">Score: {{ deck.bestScore || 0 }}</span>
        </div>
        <div *ngIf="topDecks().length === 0" class="text-slate-400 py-4">No decks available yet.</div>
      </div>
    </div>
  `
})
export class Dashboard implements OnInit {
  private analyticsService = inject(AnalyticsService);

  usersCount = signal<number | string>('...');
  proUsersCount = signal<number>(0);
  
  totalImagesGenerated = signal<number>(0);
  totalTokensConsumed = signal<number>(0);
  
  decksCount = signal<number | string>('...');
  topDecks = signal<any[]>([]);

  async ngOnInit() {
    try {
      const userStats = await this.analyticsService.getUserStats();
      this.usersCount.set(userStats.totalUsers);
      this.proUsersCount.set(userStats.proUsers);
      this.totalImagesGenerated.set(userStats.imagesGenerated);
      this.totalTokensConsumed.set(userStats.tokensConsumed);

      const deckStats = await this.analyticsService.getDeckStats();
      this.decksCount.set(deckStats.totalDecks);
      this.topDecks.set(deckStats.topDecks);
    } catch (e) {
      console.error("Dashboard data fetch failed", e);
    }
  }
}
