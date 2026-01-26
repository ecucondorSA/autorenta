import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface SecurityData {
  // Define the properties of the SecurityData interface here
  // For example:
  // someProperty: string;
}

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private http = inject(HttpClient);

  getSecurityData(): Observable<SecurityData> {
    // Replace 'your-api-endpoint' with the actual API endpoint
    return this.http.get<SecurityData>('your-api-endpoint');
  }

  // Other methods related to security
}
