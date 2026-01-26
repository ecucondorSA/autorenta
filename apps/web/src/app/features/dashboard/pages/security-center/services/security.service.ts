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

  deleteSecurity(id: string): Observable<Security> {
    const headers = new HttpHeaders().set(
      'Authorization',
      `Bearer ${environment.authToken}`
    );
    return this.http.delete<Security>(`${this.apiUrl}/security/${id}`, { headers });
  }

  runSecurityScan(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders().set(
        'Authorization',
        `Bearer ${environment.authToken}`
      );
      fetch(`${this.apiUrl}/security/${id}/run`, {
        method: 'POST',
        headers,
      })
        .then((res) => {
          if (res.ok) {
            resolve(res);
          } else {
            reject(res);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  getSecurityScanResult(id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const headers = new HttpHeaders().set(
        'Authorization',
        `Bearer ${environment.authToken}`
      );
      fetch(`${this.apiUrl}/security/${id}/result`, {
        method: 'GET',
        headers,
      })
        .then((res) => {
          if (res.ok) {
            resolve(res);
          } else {
            reject(res);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
}
