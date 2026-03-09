import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { firestore } from '../../core/firebase/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

@Component({
  selector: 'app-dashboard',
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
      
      <!-- Revenue -->
      <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <p class="text-slate-400 font-semibold mb-1">Estimated MRR</p>
        <p class="text-4xl font-black text-emerald-400">$ {{ estRevenue() | number:'1.2-2' }}</p>
        <p class="text-slate-400 text-sm mt-3 font-semibold">Based on $4.99/mo</p>
      </div>

      <!-- AI Costs -->
      <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <p class="text-slate-400 font-semibold mb-1">Vertex AI Cost (Images)</p>
        <p class="text-4xl font-black text-pink-400">$ {{ apiCost() | number:'1.2-2' }}</p>
        <p class="text-slate-400 text-sm mt-3 font-semibold">{{ totalImagesGenerated() }} Total Images</p>
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
  usersCount = signal<number | string>('...');
  proUsersCount = signal<number>(0);
  estRevenue = signal<number>(0);
  
  totalImagesGenerated = signal<number>(0);
  apiCost = signal<number>(0);
  
  decksCount = signal<number | string>('...');
  topDecks = signal<any[]>([]);

  async ngOnInit() {
    try {
      const usersSnap = await getDocs(collection(firestore, 'Users'));
      const count = usersSnap.size;
      this.usersCount.set(count);
      
      let proCount = 0;
      let imgCount = 0;
      
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data['isPro'] === true) proCount++;
        if (data['imagesGeneratedThisMonth']) {
           imgCount += (typeof data['imagesGeneratedThisMonth'] === 'number' ? data['imagesGeneratedThisMonth'] : 0);
        }
      });
      
      this.proUsersCount.set(proCount);
      this.estRevenue.set(proCount * 4.99);
      
      this.totalImagesGenerated.set(imgCount);
      this.apiCost.set(imgCount * 0.03); // $0.03 per image logic
      
    } catch (e) { console.error("Could not fetch Users data", e); }

    try {
      const decksQuery = query(collection(firestore, 'FlashcardDecks'), orderBy('bestScore', 'desc'), limit(5));
      const decksSnap = await getDocs(decksQuery);
      
      // We still want total decks count, but for simplicity let's just count all from a base query
      const allDecksSnap = await getDocs(collection(firestore, 'FlashcardDecks'));
      this.decksCount.set(allDecksSnap.size);
      
      const decksList: any[] = [];
      decksSnap.forEach(doc => {
        decksList.push({ id: doc.id, ...doc.data() });
      });
      this.topDecks.set(decksList);
      
    } catch (e) { console.error("Could not fetch Flashcard Decks", e); }
  }
}
