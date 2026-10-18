import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('cognito-idp.') || req.url.includes('amazoncognito.com')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getAccessToken();
  const user = authService.currentUser();

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (user?.username) {
    headers['X-User-Id'] = user.username;
  }

  if (Object.keys(headers).length > 0) {
    return next(req.clone({ setHeaders: headers }));
  }

  return next(req);
};
