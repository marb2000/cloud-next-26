import { Injectable } from '@angular/core';
import { collection, doc, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/firebase';
import { Observable } from 'rxjs';

export interface PendingDeck {
  id: string;
  title: string;
  status: string;
  isPublic: boolean;
  items: {
    original?: string;
    translation?: string;
    image?: string;
    term?: string;
    definition?: string;
    imageArt?: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class ModerationService {
  private decksCollection = collection(firestore, 'FlashcardDecks');

  constructor() { }

  getPendingDecks(): Observable<PendingDeck[]> {
    return new Observable<PendingDeck[]>(observer => {
      const q = query(this.decksCollection, where('status', '==', 'pending'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const decks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PendingDeck));
        observer.next(decks);
      });
      return () => unsubscribe();
    });
  }

  async approveDeck(id: string): Promise<void> {
    const docRef = doc(this.decksCollection, id);
    await updateDoc(docRef, { status: 'published', isPublic: true });
  }

  async rejectDeck(id: string): Promise<void> {
    const docRef = doc(this.decksCollection, id);
    await updateDoc(docRef, { status: 'draft', isPublic: false });
  }
}
