import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'apps/web/src/environments/environment';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  private readonly _is2FAEnabled = new BehaviorSubject<boolean>(false);
  public readonly is2FAEnabled$: Observable<boolean> = this._is2FAEnabled.asObservable();

  constructor() {
    this.load2FAStatus();
  }

  load2FAStatus(): void {
    this.get2FAStatus().subscribe((isEnabled) => {
      this._is2FAEnabled.next(isEnabled);
    });
  }

  get2FAStatus(): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/auth/2fa/status`).pipe(tap(console.log));
  }

  enable2FA(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/2fa/enable`, {}).pipe(tap(console.log));
  }

  disable2FA(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/2fa/disable`, {}).pipe(tap(console.log));
  }

  generate2FASecret(): Observable<{
    secret: string;
    qrCodeUrl: string;
  }> {
    return this.http.get<{
      secret: string;
      qrCodeUrl: string;
    }>(`${this.apiUrl}/auth/2fa/generate`).pipe(tap(console.log));
  }

  verify2FAToken(token: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/2fa/verify`, { token })
      .pipe(tap(console.log));
  }

  getRecoveryCodes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/auth/recovery-codes`).pipe(tap(console.log));
  }

  invalidateRecoveryCodes(): Observable<string[]> {
    return this.http
      .post<string[]>(`${this.apiUrl}/auth/recovery-codes/invalidate`, {})
      .pipe(tap(console.log));
  }

  backupCodes(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/recovery-codes/backup`, {}).pipe(tap(console.log));
  }

  loginWithRecoveryCode(recoveryCode: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/recovery-code/login`, { recoveryCode })
      .pipe(tap(console.log));
  }

  // Password Management
  changePassword(changePasswordDto: {
    currentPasswordPlain: string;
    newPasswordPlain: string;
  }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/change-password`, changePasswordDto)
      .pipe(tap(console.log));
  }

  resetPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/reset-password`, { email }).pipe(tap(console.log));
  }

  confirmResetPassword(confirmResetPasswordDto: {
    resetToken: string;
    newPasswordPlain: string;
  }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/auth/reset-password/confirm`, confirmResetPasswordDto)
      .pipe(tap(console.log));
  }

  // Security Logs
  getSecurityLogs(page: number, limit: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/security-logs?page=${page}&limit=${limit}`)
      .pipe(tap(console.log));
  }

  // WebAuthn
  registerWebAuthn(name: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/webauthn/register`, { name }).pipe(tap(console.log));
  }

  verifyWebAuthn(token: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/webauthn/verify`, { token }).pipe(tap(console.log));
  }
}
