import { Injectable } from '@angular/core';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../firebase/firebase';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor() { }

  async getUserStats() {
    const usersSnap = await getDocs(collection(firestore, 'Users'));
    let proCount = 0;
    let imgCount = 0;
    let tokenCount = 0;

    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data['status'] === 'PRO') proCount++;
      if (data['imagesGeneratedThisMonth']) {
        imgCount += (typeof data['imagesGeneratedThisMonth'] === 'number' ? data['imagesGeneratedThisMonth'] : 0);
      }
      if (data['tokensConsumedThisMonth']) {
        tokenCount += (typeof data['tokensConsumedThisMonth'] === 'number' ? data['tokensConsumedThisMonth'] : 0);
      }
    });

    return {
      totalUsers: usersSnap.size,
      proUsers: proCount,
      imagesGenerated: imgCount,
      tokensConsumed: tokenCount
    };
  }

  async getDeckStats() {
    const allDecksSnap = await getDocs(collection(firestore, 'FlashcardDecks'));
    const topDecksQuery = query(collection(firestore, 'FlashcardDecks'), orderBy('bestScore', 'desc'), limit(5));
    const topDecksSnap = await getDocs(topDecksQuery);

    const topDecks = topDecksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return {
      totalDecks: allDecksSnap.size,
      topDecks
    };
  }
}
