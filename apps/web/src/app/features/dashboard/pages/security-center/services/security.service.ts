import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../../../core/models/security.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<Security[]> {
    const headers = new HttpHeaders().set(
      'Authorization',
      `Bearer ${environment.authToken}`
    );
    return this.http.get<Security[]>(`${this.apiUrl}/security`, { headers });
  }

  getSecurityById(id: string): Observable<Security> {
    const headers = new HttpHeaders().set(
      'Authorization',
      `Bearer ${environment.authToken}`
    );
    return this.http.get<Security>(`${this.apiUrl}/security/${id}`, { headers });
  }

  createSecurity(securityData: Security): Observable<Security> {
    const headers = new HttpHeaders().set(
      'Authorization',
      `Bearer ${environment.authToken}`
    );
    return this.http.post<Security>(`${this.apiUrl}/security`, securityData, { headers });
  }

  updateSecurity(id: string, securityData: Security): Observable<Security> {
    const headers = new HttpHeaders().set(
      'Authorization',
      `Bearer ${environment.authToken}`
    );
    return this.http.put<Security>(`${this.apiUrl}/security/${id}`, securityData, { headers });
  }

  deleteSecurity(id: string): Observable<any> {
    const headers = new HttpHeaders().set(
      'Authorization',
      `Bearer ${environment.authToken}`
    );
    return this.http.delete<any>(`${this.apiUrl}/security/${id}`, { headers });
  }

  runSecurityCheck(id: string): Observable<any> {
    const headers = new HttpHeaders().set(
      'Authorization',
      `Bearer ${environment.authToken}`
    );
    return this.http.post<any>(`${this.apiUrl}/security/${id}/run-check`, {}, { headers });
  }

  // Mocked Endpoints
  getAllMocked(): Observable<any> {
    return this.http.get<any>('assets/mocks/security.mock.json');
  }

  getMockedSecurityById(id: string): Observable<any> {
    return this.http.get<any>(`assets/mocks/security.mock.json`);
  }

  startMockedSecurityCheck(id: string, res: any, err: any): Observable<any> {
    return new Observable((observer) => {
      observer.next({
        id: id,
        status: 'running',
      });
      observer.complete();
    });
  }

  stopMockedSecurityCheck(id: string, res: any, err: any): Observable<any> {
    return new Observable((observer) => {
      observer.next({
        id: id,
        status: 'stopped',
      });
      observer.complete();
    });
  }
}
