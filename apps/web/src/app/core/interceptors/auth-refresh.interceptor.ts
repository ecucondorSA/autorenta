import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, from, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

// Global state for the interceptor (module-level to persist across requests)
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authRefreshInterceptor: HttpInterceptorFn = (req, next) => {
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
                return next(addToken(req, session.access_token));
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
              return next(addToken(req, token!));
            }),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
