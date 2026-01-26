import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Security } from '../../../../../../core/models/security.model';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private securityDataSubject = new BehaviorSubject<Security | null>(null);
  public securityData$ = this.securityDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<Security> {
    return this.http
      .get<Security>(`${environment.apiUrl}/security`)
      .pipe(
        tap((data) => {
          this.securityDataSubject.next(data);
        })
      );
  }

  updateSecurityData(data: Security): Observable<Security> {
    return this.http
      .put<Security>(`${environment.apiUrl}/security`, data)
      .pipe(
        tap((updatedData) => {
          this.securityDataSubject.next(updatedData);
        })
      );
  }

  getBreachData(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/breaches`);
  }

  getComplianceData(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/compliance`);
  }

  getVulnerabilityData(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/vulnerabilities`);
  }

  getThreatData(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/threats`);
  }

  getIncidentData(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/incidents`);
  }

  getRiskData(): Observable<any> {
    return this.http.get(`${environment.apiUrl}/risks`);
  }
}
