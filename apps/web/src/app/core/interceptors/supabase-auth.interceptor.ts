import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

export const SupabaseAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.sessionSignal()?.access_token;

  if (!token || req.headers.has('Authorization')) {
    return next(req);
  }

  const headers = req.headers
    .set('Authorization', `Bearer ${token}`)
    .set('apikey', environment.supabaseAnonKey);

  const authorized = req.clone({ headers });

  return next(authorized);
};
