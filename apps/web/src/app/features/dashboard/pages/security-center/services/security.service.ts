import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SecurityService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getSecurityQuestions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-questions`);
  }

  verifySecurityQuestions(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-questions/verify`, payload);
  }

  resetPassword(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, payload);
  }

  updatePassword(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/update-password`, payload);
  }

  enable2FA(): Observable<any> {
    return this.http.post(`${this.apiUrl}/enable-2fa`, {});
  }

  disable2FA(): Observable<any> {
    return this.http.post(`${this.apiUrl}/disable-2fa`, {});
  }

  generateRecoveryCodes(): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate-recovery-codes`, {});
  }

  getRecoveryCodes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/recovery-codes`);
  }

  verifyRecoveryCode(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/recovery-codes/verify`, { code });
  }

  backupCodes(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/backup-codes`, payload);
  }

  getBackupCodes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/backup-codes`);
  }

  verifyBackupCode(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/backup-codes/verify`, { code });
  }

  // New methods for security center
  getSecurityCenterData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-center`);
  }

  updateSecurityCenterData(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-center`, data);
  }

  // Method to fetch user activity logs
  getUserActivityLogs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user-activity-logs`);
  }

  // Method to fetch security recommendations
  getSecurityRecommendations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-recommendations`);
  }

  // Method to apply security recommendation
  applySecurityRecommendation(recommendationId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-recommendations/${recommendationId}/apply`, {});
  }

  // Method to dismiss security recommendation
  dismissSecurityRecommendation(recommendationId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-recommendations/${recommendationId}/dismiss`, {});
  }

  initiatePasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/initiate-password-reset`, { email });
  }

  confirmPasswordReset(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/confirm-password-reset`, payload);
  }

  get2FAStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/2fa-status`);
  }
}
