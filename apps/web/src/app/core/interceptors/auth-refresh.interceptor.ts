import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, catchError, filter, from, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// Global state for the interceptor (module-level to persist across requests)
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  // SSR-safe: Skip auth refresh during prerendering
  if (!isBrowser) {
    return next(req);
  }

  const auth = inject(AuthService);

  const addToken = (request: typeof req, token: string) => {
    return request.clone({
      headers: request.headers
        .set('Authorization', `Bearer ${token}`)
        .set('apikey', environment.supabaseAnonKey),
    });
  };

  return next(req).pipe(
    catchError((error) => {
      // Break infinite loop: If already retried once, don't try again
      if (req.headers.has('X-Retry-Attempt')) {
        return throwError(() => error);
      }

      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !req.url.includes('auth/v1/token') // Avoid infinite loops if refresh endpoint fails
      ) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return from(auth.refreshSession()).pipe(
            switchMap((session) => {
              isRefreshing = false;
              if (session?.access_token) {
                refreshTokenSubject.next(session.access_token);
                // Mark request as retried to prevent infinite loops
                const retriedReq = addToken(req, session.access_token).clone({
                  headers: req.headers.set('X-Retry-Attempt', '1')
                });
                return next(retriedReq);
              }
              // Refresh failed
              auth.signOut();
              return throwError(() => error);
            }),
            catchError((err) => {
              isRefreshing = false;
              auth.signOut();
              return throwError(() => err);
            }),
          );
        } else {
          // Wait for refresh to complete
          return refreshTokenSubject.pipe(
            filter((token) => token != null),
            take(1),
            switchMap((token) => {
              const retriedReq = addToken(req, token!).clone({
                headers: req.headers.set('X-Retry-Attempt', '1')
              });
              return next(retriedReq);
            }),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
