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

  getSecurityQuestions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-questions`);
  }

  verifySecurityQuestions(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-questions/verify`, data);
  }

  resetPassword(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }

  updatePassword(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-password`, data);
  }

  enable2FA(): Observable<any> {
    return this.http.post(`${this.apiUrl}/2fa/enable`, {});
  }

  disable2FA(): Observable<any> {
    return this.http.post(`${this.apiUrl}/2fa/disable`, {});
  }

  generate2FASecret(): Observable<any> {
    return this.http.get(`${this.apiUrl}/2fa/generate`);
  }

  verify2FAToken(token: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/2fa/verify`, { token });
  }

  get2FAStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/2fa/status`);
  }

  getAuditLogs(page: number, limit: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/audit-logs?page=${page}&limit=${limit}`);
  }

  getFailedLogins(page: number, limit: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/failed-logins?page=${page}&limit=${limit}`);
  }

  getSecurityRecommendations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-recommendations`);
  }

  dismissSecurityRecommendation(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security-recommendations/${id}`);
  }

  getSecurityScore(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-score`);
  }

  getSecurityScoreHistory(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-score/history`);
  }

  // Example of a method that uses the inject function (currently unused)
  // You can remove this if it's not needed, or use it in your component.
  // constructor(@Inject(SOME_TOKEN) private someDependency: SomeType) {}
}
