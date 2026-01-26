import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'apps/web/src/environments/environment';
import { catchError, map, Observable, of, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getSecurityData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security`).pipe(
      tap((data) => console.log('Security data retrieved:', data)),
      catchError((error) => {
        console.error('Error fetching security data:', error);
        return of(null);
      })
    );
  }

  getBreachData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/breaches`).pipe(
      tap((data) => console.log('Breach data retrieved:', data)),
      catchError((error) => {
        console.error('Error fetching breach data:', error);
        return of(null);
      })
    );
  }

  getComplianceData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/compliance`).pipe(
      tap((data) => console.log('Compliance data retrieved:', data)),
      catchError((error) => {
        console.error('Error fetching compliance data:', error);
        return of(null);
      })
    );
  }

  getVulnerabilityData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/vulnerabilities`).pipe(
      tap((data) => console.log('Vulnerability data retrieved:', data)),
      catchError((error) => {
        console.error('Error fetching vulnerability data:', error);
        return of(null);
      })
    );
  }

  // Consider defining interfaces or types for the responses from the API
  // Example:
  // interface ApiResponse {
  //   data: any[]; // Replace 'any' with a more specific type
  //   status: string;
  // }
  //
  // Then update the return types of the methods:
  // getSecurityData(): Observable<ApiResponse> {

  updateSecuritySettings(settings: any): Observable<any> {
    // Replace 'any' with a more specific type representing the settings object
    return this.http.post(`${this.apiUrl}/security/settings`, settings).pipe(
      tap((response) => console.log('Security settings updated:', response)),
      catchError((error) => {
        console.error('Error updating security settings:', error);
        return of(null);
      })
    );
  }

  performSecurityScan(): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/scan`, {}).pipe(
      tap((response) => console.log('Security scan initiated:', response)),
      catchError((error) => {
        console.error('Error initiating security scan:', error);
        return of(null);
      })
    );
  }

  getFirewallStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/firewall`).pipe(
      tap((data) => console.log('Firewall status retrieved:', data)),
      catchError((error) => {
        console.error('Error fetching firewall status:', error);
        return of(null);
      })
    );
  }

  enableFirewall(): Observable<any> {
    return this.http.post(`${this.apiUrl}/firewall/enable`, {}).pipe(
      tap((response) => console.log('Firewall enabled:', response)),
      catchError((error) => {
        console.error('Error enabling firewall:', error);
        return of(null);
      })
    );
  }

  disableFirewall(): Observable<any> {
    return this.http.post(`${this.apiUrl}/firewall/disable`, {}).pipe(
      tap((response) => console.log('Firewall disabled:', response)),
      catchError((error) => {
        console.error('Error disabling firewall:', error);
        return of(null);
      })
    );
  }

  getLogs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/logs`).pipe(
      tap((data) => console.log('Logs retrieved:', data)),
      catchError((error) => {
        console.error('Error fetching logs:', error);
        return of(null);
      })
    );
  }

  clearLogs(): Observable<any> {
    return this.http.post(`${this.apiUrl}/logs/clear`, {}).pipe(
      tap((response) => console.log('Logs cleared:', response)),
      catchError((error) => {
        console.error('Error clearing logs:', error);
        return of(null);
      })
    );
  }

  // Example of handling errors and responses with specific types
  // getSecurityData(): Observable<SecurityData | null> {
  //   return this.http.get<SecurityData>(`${this.apiUrl}/security`).pipe(
  //     tap(data => console.log('Security data retrieved:', data)),
  //     catchError(err => {
  //       console.error('Error fetching security data:', err);
  //       return of(null);
  //     })
  //   );
  // }

  // updateSecuritySettings(settings: SecuritySettings): Observable<ApiResponse> {
  //   return this.http.post<ApiResponse>(`${this.apiUrl}/security/settings`, settings).pipe(
  //     tap(res => console.log('Security settings updated:', res)),
  //     catchError(err => {
  //       console.error('Error updating security settings:', err);
  //       return of({ status: 'error', message: err.message });
  //     })
  //   );
  // }
}

// Example interfaces for the API responses
// interface SecurityData {
//   /* Define the structure of the security data */
// }

// interface SecuritySettings {
//   /* Define the structure of the security settings */
// }

// interface ApiResponse {
//   status: string;
//   message: string;
// }
