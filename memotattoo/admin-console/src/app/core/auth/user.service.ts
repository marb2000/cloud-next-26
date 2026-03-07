import { Injectable, computed, inject, signal } from '@angular/core';
import { Auth } from './auth';
import { firestore } from '../firebase/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export interface UserProfile {
  email: string;
  energy_bolts: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private auth = inject(Auth);

  // Observable state for the current user's profile data
  profile = signal<UserProfile | null>(null);
  user = this.auth.currentUser;

  constructor() {
    // React to auth state changes to load user profile
    this.auth.currentUser.set = new Proxy(this.auth.currentUser.set, {
      apply: (target, thisArg, argumentsList) => {
        const user = argumentsList[0];
        if (user) {
          this.loadUserProfile(user.uid);
        } else {
          this.profile.set(null);
        }
        return Reflect.apply(target, thisArg, argumentsList);
      }
    });

    // Initial load if user is already present
    const currentUser = this.auth.currentUser();
    if (currentUser) {
      this.loadUserProfile(currentUser.uid);
    }
  }

  private async loadUserProfile(uid: string) {
    try {
      const userRef = doc(firestore, 'Users', uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        this.profile.set(userSnap.data() as UserProfile);
      } else {
        console.warn("User profile not found in Users collection.");
        this.profile.set(null);
      }
    } catch (e) {
      console.error("Failed to fetch User profile", e);
      this.profile.set(null);
    }
  }

  /**
   * Deducts bolts if the user has enough.
   * Returns true if successful, false if insufficient bolts.
   */
  async consumeBolts(amount: number): Promise<boolean> {
    const user = this.auth.currentUser();
    if (!user) return false;

    // Check frontend optimism
    const currentProfile = this.profile();
    if (!currentProfile || currentProfile.energy_bolts < amount) {
      return false; // Not enough bolts
    }

    // Apply strict backend deduction using firestore increment
    try {
      const userRef = doc(firestore, 'Users', user.uid);
      await updateDoc(userRef, {
        energy_bolts: increment(-amount)
      });

      // Optimistically update the UI profile signal
      this.profile.update(p => p ? { ...p, energy_bolts: p.energy_bolts - amount } : null);
      return true;
    } catch (e) {
      console.error("Failed to consume bolts", e);
      return false;
    }
  }

  /**
   * Reward a creator (by uid) with bolts when their content is played.
   * This operates independently of the local profile, targeting an external document.
   */
  async rewardCreator(creatorUid: string, amount: number): Promise<void> {
    try {
      const userRef = doc(firestore, 'Users', creatorUid);
      await updateDoc(userRef, {
        energy_bolts: increment(amount)
      });
    } catch (e) {
      console.error(`Failed to reward creator ${creatorUid} with ${amount} bolts`, e);
      throw e;
    }
  }
}
