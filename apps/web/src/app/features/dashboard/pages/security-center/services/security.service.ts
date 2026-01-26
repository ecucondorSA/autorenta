import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private baseUrl = 'your-api-endpoint';

  constructor(private http: HttpClient) {}

  // Example: Replace 'any' with a specific interface or type
  getSecurityData(): Observable<any> { // Replace any with specific type
    return this.http.get<any>(`${this.baseUrl}/security`); // Replace any with specific type
  }

  // Example: Replace 'any' with a specific interface or type
  postSecurityData(data: any): Observable<any> { // Replace any with specific type
    return this.http.post<any>(`${this.baseUrl}/security`, data); // Replace any with specific type
  }
}
