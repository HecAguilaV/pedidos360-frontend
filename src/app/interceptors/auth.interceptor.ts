import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.includes('cognito-idp.') || req.url.includes('amazoncognito.com')) {
    return next(req);
  }

  if (req.headers.has('X-Skip-Auth-Interceptor')) {
    const cleanedHeaders = req.headers.delete('X-Skip-Auth-Interceptor');
    return next(req.clone({ headers: cleanedHeaders }));
  }

  const authService = inject(AuthService);
  const token = authService.getAccessToken();
  const user = authService.currentUser();

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (user?.username && req.url.includes('/api/v1/carrito')) {
    headers['X-User-Id'] = user.username;
  }

  if (Object.keys(headers).length > 0) {
    return next(req.clone({ setHeaders: headers }));
  }

  return next(req);
};
