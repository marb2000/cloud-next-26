import { Injectable, signal, computed } from '@angular/core';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { Router } from '@angular/router';
import { auth, firestore } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  // Using Angular signals for reactive state
  currentUser = signal<User | null>(null);
  isAdmin = signal<boolean>(false);
  isInitializing = signal<boolean>(true);

  private resolveAuthState!: () => void;
  public authStateReady = new Promise<void>(resolve => {
    this.resolveAuthState = resolve;
  });

  constructor(private router: Router) {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser.set(user);
      if (user && user.email) {
        try {
          // Check Firestore to see if this user's email is on the VIP List
          const adminRef = doc(firestore, 'Admins', user.email);
          const adminSnap = await getDoc(adminRef);

          if (adminSnap.exists()) {
            this.isAdmin.set(true);
          } else {
            console.warn("User exists but is not an authorized Admin.");
            this.isAdmin.set(false);
          }
        } catch (e) {
          console.error("Failed to fetch Admin config", e);
          this.isAdmin.set(false);
        }
      } else {
        this.isAdmin.set(false);
      }
      this.isInitializing.set(false);
      this.resolveAuthState();
    });
  }

  async login(email: string, pass: string) {
    await signInWithEmailAndPassword(auth, email, pass);
    this.router.navigate(['/']); // Dashboard
  }

  async logout() {
    await signOut(auth);
    this.router.navigate(['/auth']);
  }
}
