import { Injectable, inject } from '@angular/core';
import { firestore } from '../firebase/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Observable } from 'rxjs';

export interface FirebaseUser {
  id: string; // The uid
  email: string;
  energy_bolts: number;
  isBanned: boolean;
  status: string;
  interests: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {

  constructor() { }

  /**
   * Returns an Observable that emits the list of all users in real-time.
   */
  getUsers(): Observable<FirebaseUser[]> {
    return new Observable<FirebaseUser[]>((subscriber) => {
      const q = query(collection(firestore, 'Users'));
      const unsubscribe = onSnapshot(q, (snap) => {
        const data: FirebaseUser[] = [];
        snap.forEach(docSnap => {
          const d = docSnap.data();
          data.push({
            id: docSnap.id,
            email: d['email'] || '',
            energy_bolts: d['energy_bolts'] || 0,
            isBanned: d['isBanned'] || false,
            status: d['status'] || 'FREE',
            interests: d['interests'] || []
          });
        });

        // Sort: Banned users at the bottom, then by bolts descending
        data.sort((a, b) => {
          if (a.isBanned === b.isBanned) {
            return b.energy_bolts - a.energy_bolts;
          }
          return a.isBanned ? 1 : -1;
        });

        subscriber.next(data);
      }, (error) => {
        subscriber.error(error);
      });

      return () => unsubscribe();
    });
  }

  /**
   * Updates the energy bolts for a specific user.
   */
  async updateBolts(userId: string, bolts: number): Promise<void> {
    const userRef = doc(firestore, 'Users', userId);
    await updateDoc(userRef, { energy_bolts: bolts });
  }

  /**
   * Toggles the ban status of a user.
   */
  async setBanStatus(userId: string, isBanned: boolean): Promise<void> {
    const userRef = doc(firestore, 'Users', userId);
    await updateDoc(userRef, { isBanned });
  }

  /**
   * Permanently deletes a user from the database.
   */
  async deleteUser(userId: string): Promise<void> {
    const userRef = doc(firestore, 'Users', userId);
    await deleteDoc(userRef);
  }
}
