import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { SecurityConfiguration } from '../../models/security-configuration.model';
import { SecurityTestResult } from '../../models/security-test-result.model';
import { SecurityTest } from '../../models/security-test.model';
import { SecurityDashboard } from '../../models/security-dashboard.model';
import { Vulnerability } from '../../models/vulnerability.model';
import { AuthService } from '@core/services/auth.service';
import { ToastService } from '@shared/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { Security } from '../../../../../../core/models/security.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService,
    private translateService: TranslateService,
    private router: Router
  ) {}

  getSecurityDashboard(): Observable<SecurityDashboard> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get<SecurityDashboard>(`${this.apiUrl}/security/dashboard`, { headers });
  }

  getSecurityConfiguration(): Observable<SecurityConfiguration> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get<SecurityConfiguration>(`${this.apiUrl}/security/configuration`, { headers });
  }

  updateSecurityConfiguration(securityConfiguration: SecurityConfiguration): Observable<SecurityConfiguration> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.put<SecurityConfiguration>(`${this.apiUrl}/security/configuration`, securityConfiguration, { headers });
  }

  runSecurityTest(test: SecurityTest): Observable<SecurityTestResult> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post<SecurityTestResult>(`${this.apiUrl}/security/test`, test, { headers });
  }

  getVulnerabilities(): Observable<Vulnerability[]> {
    const token = this.authService.getToken();
        const headers = new HttpHeaders({
            Authorization: `Bearer ${token}`,
        });
    return this.http.get<Vulnerability[]>(`${this.apiUrl}/security/vulnerabilities`, { headers });
  }

  getSecurityData(): Observable<Security[]> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.get<Security[]>(`${this.apiUrl}/security`, { headers });
  }

  addSecurityData(data: any): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.post<any>(`${this.apiUrl}/security`, data, { headers })
      .subscribe(
        (res) => {
          this.toastService.success(this.translateService.instant('SECURITY_CENTER.SECURITY_ADDED'));
          this.router.navigate(['/dashboard/security-center']);
        },
        (err) => {
          this.toastService.error(this.translateService.instant('SECURITY_CENTER.SECURITY_ADDED_ERROR'));
        }
      );
  }

  updateSecurityData(data: any, id: number): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.put<any>(`${this.apiUrl}/security/${id}`, data, { headers })
      .subscribe(
        (res) => {
          this.toastService.success(this.translateService.instant('SECURITY_CENTER.SECURITY_UPDATED'));
          this.router.navigate(['/dashboard/security-center']);
        },
        (err) => {
          this.toastService.error(this.translateService.instant('SECURITY_CENTER.SECURITY_UPDATED_ERROR'));
        }
      );
  }

  deleteSecurityData(id: number): Observable<any> {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
    return this.http.delete<any>(`${this.apiUrl}/security/${id}`, { headers });
  }
}
