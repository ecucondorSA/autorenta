import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityData(): any {
    return this.http.get(`${this.apiUrl}/security`);
  }

  getBreachData(): any {
    return this.http.get(`${this.apiUrl}/breaches`);
  }
}
