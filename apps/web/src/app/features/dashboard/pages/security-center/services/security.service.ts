import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  constructor() {}

  getSecurityIncidents(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-incidents`);
  }

  getSecurityIncident(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-incidents/${id}`);
  }

  createSecurityIncident(incident: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-incidents`, incident);
  }

  updateSecurityIncident(id: string, incident: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/security-incidents/${id}`, incident);
  }

  deleteSecurityIncident(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security-incidents/${id}`);
  }

  getSecurityAlerts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-alerts`);
  }

  getSecurityAlert(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-alerts/${id}`);
  }

  createSecurityAlert(alert: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-alerts`, alert);
  }

  updateSecurityAlert(id: string, alert: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/security-alerts/${id}`, alert);
  }

  deleteSecurityAlert(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security-alerts/${id}`);
  }

  // Consider defining interfaces or types for the responses from the API
  // to replace 'any' with specific types.
  getSystemLogs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/system-logs`);
  }

  // Consider defining interfaces or types for the responses from the API
  // to replace 'any' with specific types.
  analyzeSecurityData(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-analysis`, data);
  }

  // Consider defining interfaces or types for the responses from the API
  // to replace 'any' with specific types.
  generateSecurityReport(filters: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-reports`, filters);
  }
}
