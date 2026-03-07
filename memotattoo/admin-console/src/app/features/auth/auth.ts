import { Component, inject, signal } from '@angular/core';
import { Auth as AuthService } from '../../core/auth/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  templateUrl: './auth.html',
  styleUrls: ['./auth.css']
})
export class Auth {
  private authService = inject(AuthService);
  private router = inject(Router);

  error = signal<string | null>(null);
  loading = signal<boolean>(false);

  constructor() {
    // Prevent logged-in admins from seeing the login screen
    if (!this.authService.isInitializing() && this.authService.isAdmin()) {
      this.router.navigate(['/']);
    }
  }

  async onLogin(event: Event) {
    event.preventDefault();
    this.error.set(null);
    this.loading.set(true);

    const form = event.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      await this.authService.login(email, password);
      // Let the routing guard verify admin claims on the redirect
    } catch (e: any) {
      if (e.code === 'auth/invalid-credential') {
        this.error.set('Invalid admin credentials.');
      } else {
        this.error.set(e.message || 'Authentication failed.');
      }
      this.loading.set(false);
    }
  }
}
