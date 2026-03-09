import { inject, effect } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const adminGuard: CanActivateFn = async (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Wait if auth is still initializing
  if (auth.isInitializing()) {
    await auth.authStateReady;
  }

  // Once initialized, check if they are an admin
  if (auth.isAdmin()) {
    return true;
  }

  // Otherwise kick them to login
  return router.parseUrl('/auth');
};
