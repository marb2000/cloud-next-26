import { Component, signal, OnInit } from '@angular/core';
import { firestore } from '../../core/firebase/firebase';
import { collection, getCountFromServer } from 'firebase/firestore';

@Component({
  selector: 'app-dashboard',
  imports: [],
  template: `
    <h2 class="text-3xl font-bold text-slate-100 mb-8 tracking-tight">Dashboard</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div class="absolute top-0 right-0 p-4 opacity-10">
           <svg class="w-16 h-16 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        </div>
        <p class="text-slate-400 font-semibold mb-1">Daily Active Users</p>
        <p class="text-4xl font-black text-white">{{ usersCount() }}</p>
        <p class="text-emerald-400 text-sm mt-3 font-semibold">+ 12.5% vs yesterday</p>
      </div>
      
      <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div class="absolute top-0 right-0 p-4 opacity-10">
           <svg class="w-16 h-16 text-pink-400" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
        </div>
        <p class="text-slate-400 font-semibold mb-1">Shared Image Pool</p>
        <p class="text-4xl font-black text-white">{{ flashcardsCount() }}</p>
        <p class="text-emerald-400 text-sm mt-3 font-semibold">+ 840 generated today</p>
      </div>
      
      <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div class="absolute top-0 right-0 p-4 opacity-10">
           <svg class="w-16 h-16 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
        </div>
        <p class="text-slate-400 font-semibold mb-1">Vertex AI API Costs</p>
        <p class="text-4xl font-black text-white">$43.20</p>
        <p class="text-slate-400 text-sm mt-3 font-semibold">Projected: $1,250 MTD</p>
      </div>
    </div>
    
    <div class="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-lg">
      <h3 class="text-xl font-bold text-slate-100 mb-4">Latest Firebase Activity Logs</h3>
      <div class="space-y-3">
        <div class="flex items-center gap-4 py-3 border-b border-slate-700/50">
          <div class="h-2 w-2 rounded-full bg-emerald-400"></div>
          <span class="text-slate-300 font-mono text-sm">Auth</span>
          <span class="text-slate-400">New user signed up</span>
          <span class="ml-auto text-slate-500 text-sm">2 min ago</span>
        </div>
        <div class="flex items-center gap-4 py-3 border-b border-slate-700/50">
          <div class="h-2 w-2 rounded-full bg-blue-400"></div>
          <span class="text-slate-300 font-mono text-sm">AI Logic</span>
          <span class="text-slate-400">GenAI requested: "Cyberpunk Apple" - Serving from shared pool cache</span>
          <span class="ml-auto text-slate-500 text-sm">5 min ago</span>
        </div>
        <div class="flex items-center gap-4 py-3">
          <div class="h-2 w-2 rounded-full bg-pink-400"></div>
          <span class="text-slate-300 font-mono text-sm">AI Logic</span>
          <span class="text-slate-400">Vertex AI generated new image: "Cottagecore Spacecraft" (-3 Energy Bolts)</span>
          <span class="ml-auto text-slate-500 text-sm">12 min ago</span>
        </div>
      </div>
    </div>
  `
})
export class Dashboard implements OnInit {
  usersCount = signal<number | string>('...');
  flashcardsCount = signal<number | string>('...');

  async ngOnInit() {
    try {
      const usersSnap = await getCountFromServer(collection(firestore, 'Users'));
      this.usersCount.set(usersSnap.data().count);
    } catch (e) { console.error("Could not fetch Users count", e); }

    try {
      const cardsSnap = await getCountFromServer(collection(firestore, 'Flashcards'));
      this.flashcardsCount.set(cardsSnap.data().count);
    } catch (e) { console.error("Could not fetch Flashcards count", e); }
  }
}
