import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<any> {
    const url = `${this.apiUrl}/security`;
    return this.http.get(url);
  }

  // Vulnerability Scanning
  startVulnerabilityScan(target: string): Observable<any> {
    const url = `${this.apiUrl}/security/scan`;
    const body = { target };
    return this.http.post(url, body);
  }

  getVulnerabilityScanStatus(scanId: string): Observable<any> {
    const url = `${this.apiUrl}/security/scan/${scanId}/status`;
    return this.http.get(url);
  }

  // Intrusion Detection
  getIntrusionDetectionLogs(): Observable<any> {
    const url = `${this.apiUrl}/security/intrusion-logs`;
    return this.http.get(url);
  }

  // Security Policies
  getSecurityPolicies(): Observable<any[]> {
    const url = `${this.apiUrl}/security/policies`;
    return this.http.get<any[]>(url);
  }

  updateSecurityPolicy(policyId: string, updates: any): Observable<any> {
    const url = `${this.apiUrl}/security/policies/${policyId}`;
    return this.http.put(url, updates);
  }

  // Authentication and Authorization
  login(credentials: any): Observable<any> {
    const url = `${this.apiUrl}/auth/login`;
    return this.http.post(url, credentials);
  }

  logout(): Observable<any> {
    const url = `${this.apiUrl}/auth/logout`;
    return this.http.post(url, {});
  }

  // Data Encryption
  encryptData(data: string): Observable<any> {
    const url = `${this.apiUrl}/security/encrypt`;
    const body = { data };
    return this.http.post(url, body);
  }

  decryptData(encryptedData: string): Observable<any> {
    const url = `${this.apiUrl}/security/decrypt`;
    const body = { encryptedData };
    return this.http.post(url, body);
  }

  // Error Handling Example (adjust types as needed based on actual response)
  exampleRequest(): Observable<any> {
    return new Observable((observer) => {
      this.http.get<any>('/api/example').subscribe(
        (data) => {
          observer.next(data);
          observer.complete();
        },
        (_err) => {
          observer.error('An error occurred');
        }
      );
    });
  }

  // Example of a method that returns a specific type
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  createUser(user: User): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, user);
  }

  updateUser(id: string, user: User): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    return new Observable((observer) => {
      this.http.delete<void>(`${this.apiUrl}/users/${id}`).subscribe(
        () => {
          observer.next();
          observer.complete();
        },
        (_err) => {
          observer.error('Failed to delete user.');
        }
      );
    });
  }
}

// Example User interface (adjust properties to match your actual User object)
interface User {
  id?: string;
  name: string;
  email: string;
}
