import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves a list of security alerts.
   * @returns An Observable containing the security alerts.
   */
  getSecurityAlerts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/alerts`);
  }

  /**
   * Retrieves a summary of the user's security status.
   * @returns An Observable containing the security summary.
   */
  getSecuritySummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/summary`);
  }

  /**
   * Simulates a password reset request.
   * @param userId The ID of the user requesting the password reset.
   * @returns An Observable containing the result of the password reset request.
   */
  requestPasswordReset(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/password-reset`, { userId });
  }

  /**
   * Enables two-factor authentication for the user.
   * @param userId The ID of the user enabling two-factor authentication.
   * @returns An Observable containing the result of enabling two-factor authentication.
   */
  enableTwoFactorAuth(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/two-factor-auth/enable`, { userId });
  }

  /**
   * Disables two-factor authentication for the user.
   * @param userId The ID of the user disabling two-factor authentication.
   * @returns An Observable containing the result of disabling two-factor authentication.
   */
  disableTwoFactorAuth(userId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/two-factor-auth/disable`, { userId });
  }

    /**
   * Retrieves the security score.
   * @returns An Observable containing the security score.
   */
  getSecurityScore(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/security/score`);
  }

  /**
   * Retrieves the security tips.
   * @returns An Observable containing the security tips.
   */
  getSecurityTips(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/security/tips`);
  }

   /**
   * Performs a security scan.
   * @returns An Observable containing the results of the security scan.
   */
  performSecurityScan(): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/scan`, {});
  }

  /**
   * Retrieves the security scan results.
   * @returns An Observable containing the security scan results.
   */
  getSecurityScanResults(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/scan/results`);
  }

  /**
   * Dismisses a security alert.
   * @param alertId The ID of the alert to dismiss.
   * @returns An Observable containing the result of dismissing the alert.
   */
  dismissSecurityAlert(alertId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/alerts/dismiss`, { alertId });
  }

  /**
   * Applies a security fix.
   * @param fixId The ID of the fix to apply.
   * @returns An Observable containing the result of applying the fix.
   */
  applySecurityFix(fixId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/fixes/apply`, { fixId });
  }

   /**
   * Retrieves a list of available security fixes.
   * @returns An Observable containing the available security fixes.
   */
  getSecurityFixes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/fixes`);
  }

  /**
   * Retrieves the security settings.
   * @returns An Observable containing the security settings.
   */
  getSecuritySettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/settings`);
  }

  /**
   * Updates the security settings.
   * @param settings The new security settings.
   * @returns An Observable containing the result of updating the security settings.
   */
  updateSecuritySettings(settings: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/settings/update`, settings);
  }

   /**
   * Generates a security report.
   * @returns An Observable containing the security report.
   */
  generateSecurityReport(): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/report/generate`, {});
  }

  /**
   * Retrieves the security report.
   * @returns An Observable containing the security report.
   */
  getSecurityReport(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/report`);
  }

  /**
   * Retrieves the security history.
   * @returns An Observable containing the security history.
   */
  getSecurityHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/history`);
  }
}
