import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const SupabaseAuthInterceptor: HttpInterceptorFn = (req, next) => {
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
