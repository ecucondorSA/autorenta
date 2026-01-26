import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Authentication
  login(credentials: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/login`, credentials);
  }

  register(userData: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/register`, userData);
  }

  forgotPassword(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(resetData: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/reset-password`, resetData);
  }

  // User Management
  getUserProfile(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/users/profile`);
  }

  updateUserProfile(userData: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/users/profile`, userData);
  }

  deleteUserAccount(): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/users/account`);
  }

  // Security Measures
  enableTwoFactorAuth(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/security/two-factor/enable`, {});
  }

  disableTwoFactorAuth(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/security/two-factor/disable`, {});
  }

  getSecurityLogs(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/security/logs`);
  }

  // Additional Security Features
  trackUserActivity(activityData: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/security/activity`, activityData);
  }

  monitorLoginAttempts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/security/login-attempts`);
  }

  // Example of a generic error handling (can be expanded)
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(error); // log to console instead
      // Let the app keep running by returning an empty result.
      return new Observable<T>();
    };
  }

  // Example usage of the generic error handler in an API call
  exampleApiCall(): Observable<any> {
    return this.http.get<any>('/api/example')
      .pipe(
        // catchError(this.handleError<any>('exampleApiCall', []))
      );
  }

  getAllSecurityQuestions(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/security-questions`).pipe(map((response: any) => response.data));
  }

  verifySecurityQuestions(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/verify-security-questions`, data);
  }

  updatePassword(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/update-password`, data);
  }

  get2FAStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/2fa-status`);
  }

  enable2FA(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/enable-2fa`, {});
  }

  disable2FA(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/disable-2fa`, {});
  }

  verify2FAToken(token: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/verify-2fa`, { token });
  }

  backupCodes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/backup-codes`);
  }

  generateBackupCodes(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/generate-backup-codes`, {});
  }

  verifyBackupCode(code: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/verify-backup-code`, { code });
  }
}
