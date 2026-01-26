import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Security } from '../../../../../../core/models/security.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private securityDataSubject = new BehaviorSubject<Security | null>(null);
  securityData$ = this.securityDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<Security> {
    const url = `${environment.apiUrl}/security`;
    return this.http.get<Security>(url).pipe(
      tap((data) => {
        this.securityDataSubject.next(data);
      })
    );
  }

  updateSecurityQuestion(question: string): Observable<any> {
    const url = `${environment.apiUrl}/security/question`;
    return this.http.put(url, { question });
  }

  verifySecurityAnswer(answer: string): Observable<any> {
    const url = `${environment.apiUrl}/security/answer`;
    return this.http.post(url, { answer });
  }

  resetSecurityData(): void {
    this.securityDataSubject.next(null);
  }

  generateRecoveryCodes(): Observable<any> {
    const url = `${environment.apiUrl}/security/recovery-codes/generate`;
    return this.http.post(url, {});
  }

  getRecoveryCodes(): Observable<any> {
    const url = `${environment.apiUrl}/security/recovery-codes`;
    return this.http.get(url);
  }

  verifyRecoveryCode(code: string): Observable<any> {
    const url = `${environment.apiUrl}/security/recovery-codes/verify`;
    return this.http.post(url, { code });
  }

  disableTwoFactorAuth(): Observable<any> {
    const url = `${environment.apiUrl}/security/two-factor-auth/disable`;
    return this.http.post(url, {});
  }

  enableTwoFactorAuth(): Observable<any> {
    const url = `${environment.apiUrl}/security/two-factor-auth/enable`;
    return this.http.post(url, {});
  }

  validateTwoFactorAuth(code: string): Observable<any> {
    const url = `${environment.apiUrl}/security/two-factor-auth/validate`;
    return this.http.post(url, { code });
  }

  backupCodes(): Observable<any> {
    const url = `${environment.apiUrl}/security/backup-codes`;
    return this.http.get(url);
  }

  invalidateBackupCodes(): Observable<any> {
    const url = `${environment.apiUrl}/security/backup-codes/invalidate`;
    return this.http.post(url, {});
  }

  updatePassword(currentPassword: string, newPassword: string): Observable<any> {
    const url = `${environment.apiUrl}/security/password`;
    return this.http.put(url, { currentPassword, newPassword });
  }

  validatePassword(password: string): Observable<any> {
    const url = `${environment.apiUrl}/security/password/validate`;
    return this.http.post(url, { password });
  }

  updateEmail(email: string): Observable<any> {
    const url = `${environment.apiUrl}/security/email`;
    return this.http.put(url, { email });
  }

  validateEmail(email: string): Observable<any> {
    const url = `${environment.apiUrl}/security/email/validate`;
    return this.http.post(url, { email });
  }

  resendEmailVerification(): Observable<any> {
    const url = `${environment.apiUrl}/security/email/resend-verification`;
    return this.http.post(url, {});
  }

  updatePhone(phone: string): Observable<any> {
    const url = `${environment.apiUrl}/security/phone`;
    return this.http.put(url, { phone });
  }

  validatePhone(phone: string): Observable<any> {
    const url = `${environment.apiUrl}/security/phone/validate`;
    return this.http.post(url, { phone });
  }

  resendPhoneVerification(): Observable<any> {
    const url = `${environment.apiUrl}/security/phone/resend-verification`;
    return this.http.post(url, {});
  }

  getSecurityLogs(): Observable<any> {
    const url = `${environment.apiUrl}/security/logs`;
    return this.http.get(url);
  }

  getSecurityLogById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/logs/${id}`;
    return this.http.get(url);
  }

  deleteSecurityLogById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/logs/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityLogs(): Observable<any> {
    const url = `${environment.apiUrl}/security/logs`;
    return this.http.delete(url);
  }

  getSecurityAlerts(): Observable<any> {
    const url = `${environment.apiUrl}/security/alerts`;
    return this.http.get(url);
  }

  getSecurityAlertById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/alerts/${id}`;
    return this.http.get(url);
  }

  deleteSecurityAlertById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/alerts/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityAlerts(): Observable<any> {
    const url = `${environment.apiUrl}/security/alerts`;
    return this.http.delete(url);
  }

  getSecurityNotifications(): Observable<any> {
    const url = `${environment.apiUrl}/security/notifications`;
    return this.http.get(url);
  }

  getSecurityNotificationById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/notifications/${id}`;
    return this.http.get(url);
  }

  deleteSecurityNotificationById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/notifications/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityNotifications(): Observable<any> {
    const url = `${environment.apiUrl}/security/notifications`;
    return this.http.delete(url);
  }

  getSecuritySettings(): Observable<any> {
    const url = `${environment.apiUrl}/security/settings`;
    return this.http.get(url);
  }

  updateSecuritySettings(settings: any): Observable<any> {
    const url = `${environment.apiUrl}/security/settings`;
    return this.http.put(url, settings);
  }

  getSecuritySettingById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/settings/${id}`;
    return this.http.get(url);
  }

  deleteSecuritySettingById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/settings/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecuritySettings(): Observable<any> {
    const url = `${environment.apiUrl}/security/settings`;
    return this.http.delete(url);
  }

  getSecurityDashboard(): Observable<any> {
    const url = `${environment.apiUrl}/security/dashboard`;
    return this.http.get(url);
  }

  getSecurityDashboardById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/dashboard/${id}`;
    return this.http.get(url);
  }

  deleteSecurityDashboardById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/dashboard/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityDashboards(): Observable<any> {
    const url = `${environment.apiUrl}/security/dashboard`;
    return this.http.delete(url);
  }

  getSecurityReports(): Observable<any> {
    const url = `${environment.apiUrl}/security/reports`;
    return this.http.get(url);
  }

  getSecurityReportById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/reports/${id}`;
    return this.http.get(url);
  }

  deleteSecurityReportById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/reports/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityReports(): Observable<any> {
    const url = `${environment.apiUrl}/security/reports`;
    return this.http.delete(url);
  }

  getSecurityTasks(): Observable<any> {
    const url = `${environment.apiUrl}/security/tasks`;
    return this.http.get(url);
  }

  getSecurityTaskById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/tasks/${id}`;
    return this.http.get(url);
  }

  deleteSecurityTaskById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/tasks/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityTasks(): Observable<any> {
    const url = `${environment.apiUrl}/security/tasks`;
    return this.http.delete(url);
  }

  getSecurityIncidents(): Observable<any> {
    const url = `${environment.apiUrl}/security/incidents`;
    return this.http.get(url);
  }

  getSecurityIncidentById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/incidents/${id}`;
    return this.http.get(url);
  }

  deleteSecurityIncidentById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/incidents/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityIncidents(): Observable<any> {
    const url = `${environment.apiUrl}/security/incidents`;
    return this.http.delete(url);
  }

  getSecurityVulnerabilities(): Observable<any> {
    const url = `${environment.apiUrl}/security/vulnerabilities`;
    return this.http.get(url);
  }

  getSecurityVulnerabilityById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/vulnerabilities/${id}`;
    return this.http.get(url);
  }

  deleteSecurityVulnerabilityById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/vulnerabilities/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityVulnerabilities(): Observable<any> {
    const url = `${environment.apiUrl}/security/vulnerabilities`;
    return this.http.delete(url);
  }

  getSecurityCompliance(): Observable<any> {
    const url = `${environment.apiUrl}/security/compliance`;
    return this.http.get(url);
  }

  getSecurityComplianceById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/compliance/${id}`;
    return this.http.get(url);
  }

  deleteSecurityComplianceById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/compliance/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityCompliance(): Observable<any> {
    const url = `${environment.apiUrl}/security/compliance`;
    return this.http.delete(url);
  }

  getSecurityAwareness(): Observable<any> {
    const url = `${environment.apiUrl}/security/awareness`;
    return this.http.get(url);
  }

  getSecurityAwarenessById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/awareness/${id}`;
    return this.http.get(url);
  }

  deleteSecurityAwarenessById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/awareness/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityAwareness(): Observable<any> {
    const url = `${environment.apiUrl}/security/awareness`;
    return this.http.delete(url);
  }

  getSecurityTraining(): Observable<any> {
    const url = `${environment.apiUrl}/security/training`;
    return this.http.get(url);
  }

  getSecurityTrainingById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/training/${id}`;
    return this.http.get(url);
  }

  deleteSecurityTrainingById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/training/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityTraining(): Observable<any> {
    const url = `${environment.apiUrl}/security/training`;
    return this.http.delete(url);
  }

  getSecurityPhishing(): Observable<any> {
    const url = `${environment.apiUrl}/security/phishing`;
    return this.http.get(url);
  }

  getSecurityPhishingById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/phishing/${id}`;
    return this.http.get(url);
  }

  deleteSecurityPhishingById(id: string): Observable<any> {
    const url = `${environment.apiUrl}/security/phishing/${id}`;
    return this.http.delete(url);
  }

  deleteAllSecurityPhishing(): Observable<any> {
    const url = `${environment.apiUrl}/security/phishing`;
    return this.http.delete(url);
  }
}
