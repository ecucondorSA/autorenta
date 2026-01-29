import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '@environment';
import { AuthService } from '@core/services/auth/auth.service';

export const SupabaseAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  // SSR-safe: Skip auth interception during prerendering
  if (!isBrowser) {
    return next(req);
  }

  const auth = inject(AuthService);

  // Helper to add headers
  const addAuthHeaders = (request: typeof req, token: string) => {
    const headers = request.headers
      .set('Authorization', `Bearer ${token}`)
      .set('apikey', environment.supabaseAnonKey);
    return request.clone({ headers });
  };

  // If request already has Authorization header, skip
  if (req.headers.has('Authorization')) {
    return next(req);
  }

  // If session is already loaded and valid, use it immediately
  const currentSession = auth.sessionSignal();
  if (currentSession?.access_token) {
    return next(addAuthHeaders(req, currentSession.access_token));
  }

  // If session is loading or not present, wait for ensureSession
  return from(auth.ensureSession()).pipe(
    switchMap((session) => {
      const token = session?.access_token;
      if (token) {
        return next(addAuthHeaders(req, token));
      }
      return next(req);
    }),
  );
};
