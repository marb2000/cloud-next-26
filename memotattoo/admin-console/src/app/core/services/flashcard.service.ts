import { Injectable, signal } from '@angular/core';
import { collection, doc, query, onSnapshot, updateDoc, deleteDoc, addDoc, orderBy, getDocs, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/firebase';
import { Observable } from 'rxjs';

export interface FlashcardDeck {
  id: string;
  topic: string;
  previewImages: string[];
  publishedAt: string;
  status: 'draft' | 'published' | 'unpublished' | 'locked' | 'pending' | 'private';
  owner_email?: string;
  items?: any[];
  contentBase: any;
  artDirection?: string;
  artDirectionImage?: string;
  owner_id?: string;
  isPublic?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FlashcardService {
  private decksCollection = collection(firestore, 'FlashcardDecks');

  constructor() { }

  getDecks(): Observable<FlashcardDeck[]> {
    return new Observable<FlashcardDeck[]>(observer => {
      const q = query(collection(firestore, 'FlashcardDecks'), orderBy('publishedAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const decks = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            ...data,
            topic: data.topic || data.contentBase?.title || 'Untitled Deck',
            previewImages: (data.previewImages && data.previewImages.length > 0) 
                            ? data.previewImages 
                            : (data.contentBase?.previewImages && data.contentBase.previewImages.length > 0)
                              ? data.contentBase.previewImages
                              : (data.items || data.contentBase?.items || []).slice(0, 4).map((i: any) => i.imageArt || i.image).filter(Boolean),
            items: data.items || data.contentBase?.items || []
          } as FlashcardDeck;
        });
        observer.next(decks);
      });
      return () => unsubscribe();
    });
  }

  async getDeckById(id: string): Promise<FlashcardDeck | null> {
    const docRef = doc(firestore, 'FlashcardDecks', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as any;
      return { 
        id: docSnap.id, 
        ...data,
        topic: data.topic || data.contentBase?.title || 'Untitled Deck',
        previewImages: (data.previewImages && data.previewImages.length > 0) 
                        ? data.previewImages 
                        : (data.contentBase?.previewImages && data.contentBase.previewImages.length > 0)
                          ? data.contentBase.previewImages
                          : (data.items || data.contentBase?.items || []).slice(0, 4).map((i: any) => i.imageArt || i.image).filter(Boolean),
        items: data.items || data.contentBase?.items || []
      } as FlashcardDeck;
    }
    return null;
  }

  async saveDeck(id: string | null, payload: any): Promise<string> {
    if (id) {
      await updateDoc(doc(this.decksCollection, id), payload);
      return id;
    } else {
      const docRef = await addDoc(this.decksCollection, payload);
      return docRef.id;
    }
  }

  async updateStatus(id: string, newStatus: string, isPublic: boolean): Promise<void> {
    const docRef = doc(this.decksCollection, id);
    await updateDoc(docRef, { 
      status: newStatus,
      isPublic: isPublic
    });
  }

  async deleteDeck(id: string): Promise<void> {
    await deleteDoc(doc(this.decksCollection, id));
  }
}
