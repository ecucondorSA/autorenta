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

  getSecurityRecommendations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-recommendations`);
  }

  getSecurityRecommendation(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-recommendations/${id}`);
  }

  createSecurityRecommendation(recommendation: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-recommendations`, recommendation);
  }

  updateSecurityRecommendation(id: string, recommendation: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/security-recommendations/${id}`, recommendation);
  }

  deleteSecurityRecommendation(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security-recommendations/${id}`);
  }

  // TODO: Define specific type for the return value and parameters
  runSecurityScan(scanParams: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-scan`, scanParams);
  }

  // TODO: Define specific type for the return value and parameters
  getScanResults(scanId: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-scan/${scanId}`);
  }

  // TODO: Define specific type for the return value and parameters
  generateReport(reportParams: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security-report`, reportParams);
  }

  // TODO: Define specific type for the return value
  getReport(reportId: any): Observable<any> {
    return this.http.get(`${this.apiUrl}/security-report/${reportId}`);
  }
}
