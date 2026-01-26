import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Security } from '../../../../../core/models/security.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<Security> {
    return this.http.get<Security>(`${this.apiUrl}/security`);
  }

  updateFirewall(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/security/firewall`, data);
  }

  getFirewallStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/firewall`);
  }

  updateAntivirus(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/security/antivirus`, data);
  }

  getAntivirusStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/antivirus`);
  }

  updatePassword(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/security/password`, data);
  }

  getPasswordStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/password`);
  }

  updateVPN(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/security/vpn`, data);
  }

  getVPNStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/vpn`);
  }

  updateDataEncryption(data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/security/data-encryption`, data);
  }

  getDataEncryptionStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/data-encryption`);
  }

  runDiagnostics(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/diagnostics`, {});
  }

  getDiagnosticsStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/diagnostics`);
  }

  generateReport(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/report`, {});
  }

  getReportStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/report`);
  }

  // Example error handling (can be applied to other methods)
  exampleRequest(): Observable<any> {
    return new Observable((observer) => {
      fetch(`${this.apiUrl}/some-endpoint`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          observer.next(data);
          observer.complete();
        })
        .catch((err) => {
          observer.error(err);
        });
    });
  }

  // Example error handling with async/await
  async exampleAsyncRequest(): Promise<any> {
    try {
      const res = await fetch(`${this.apiUrl}/some-endpoint`);
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      // Handle error appropriately
      console.error(err);
      throw err; // Re-throw to propagate the error
    }
  }
}
