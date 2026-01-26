import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../../../core/models/security.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityData() {
    return this.http.get<Security>(`${this.apiUrl}/security`);
  }

  updateSecurityItem(itemId: string, data: any) {
    return this.http.put<Security>(`${this.apiUrl}/security/${itemId}`, data);
  }

  createSecurityItem(data: any) {
    return this.http.post<Security>(`${this.apiUrl}/security`, data);
  }

  deleteSecurityItem(itemId: string) {
    return this.http.delete<Security>(`${this.apiUrl}/security/${itemId}`);
  }

  getSecurityItem(itemId: string) {
    return this.http.get<Security>(`${this.apiUrl}/security/${itemId}`);
  }

  // Example methods with callbacks (to be refactored to use Observables directly)
  getSecurityDataCallback(callback: (data: Security) => void) {
    this.http.get<Security>(`${this.apiUrl}/security`).subscribe({
      next: (data) => {
        callback(data);
      },
      error: (error) => {
        console.error('Error fetching security data:', error);
      },
    });
  }

  updateSecurityItemCallback(
    itemId: string,
    data: any,
    successCallback: (data: Security) => void,
    errorCallback: (error: any) => void
  ) {
    this.http.put<Security>(`${this.apiUrl}/security/${itemId}`, data).subscribe({
      next: (res) => {
        successCallback(res);
      },
      error: (err) => {
        errorCallback(err);
      },
    });
  }

  createSecurityItemCallback(
    data: any,
    successCallback: (data: Security) => void,
    errorCallback: (error: any) => void
  ) {
    this.http.post<Security>(`${this.apiUrl}/security`, data).subscribe({
      next: (res) => {
        successCallback(res);
      },
      error: (err) => {
        errorCallback(err);
      },
    });
  }

  // Example methods with promises (to be refactored to use Observables directly)
  async getSecurityDataPromise(): Promise<Security> {
    return this.http.get<Security>(`${this.apiUrl}/security`).toPromise() as Promise<Security>;
  }

  async updateSecurityItemPromise(itemId: string, data: unknown): Promise<Security> {
    return this.http.put<Security>(`${this.apiUrl}/security/${itemId}`, data).toPromise() as Promise<Security>;
  }

  async createSecurityItemPromise(data: unknown): Promise<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security`, data).toPromise() as Promise<Security>;
  }

  async deleteSecurityItemPromise(itemId: string): Promise<void> {
    return this.http.delete<void>(`${this.apiUrl}/security/${itemId}`).toPromise() as Promise<void>;
  }

  async getSecurityItemPromise(itemId: string): Promise<Security> {
    return this.http.get<Security>(`${this.apiUrl}/security/${itemId}`).toPromise() as Promise<Security>;
  }
}
