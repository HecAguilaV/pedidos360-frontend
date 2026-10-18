import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Requires any authenticated session. */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/**
 * Requires the Administrador role.
 * UX-only gate: every admin action is still enforced server-side by Spring Security.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (authService.isAdmin()) {
    return true;
  }
  return router.createUrlTree([authService.isDespachador() ? '/tracking' : '/productos']);
};

/** Requires Despachador or Administrador. */
export const staffGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }
  if (authService.isAdmin() || authService.isDespachador()) {
    return true;
  }
  return router.createUrlTree(['/productos']);
};
