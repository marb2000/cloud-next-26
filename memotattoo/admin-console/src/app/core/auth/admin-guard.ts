import { inject, effect } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  // If already loaded and we know they aren't an admin, kick them immediately
  if (!auth.isInitializing() && !auth.isAdmin()) {
    return router.parseUrl('/login');
  }

  // If we are initialized and they are an admin, let them through
  if (!auth.isInitializing() && auth.isAdmin()) {
    return true;
  }

  // Otherwise, return a promise that resolves when init finishes
  return new Promise<boolean | import('@angular/router').UrlTree>((resolve) => {
    const check = effect(() => {
      if (!auth.isInitializing()) {
        if (auth.isAdmin()) {
          resolve(true);
        } else {
          resolve(router.parseUrl('/login'));
        }
        check.destroy(); // Important: clean up the effect!
      }
    });
  });
};
