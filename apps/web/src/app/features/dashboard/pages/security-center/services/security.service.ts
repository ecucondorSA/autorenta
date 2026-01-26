import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityQuestions() {
    return this.http.get<unknown>(`${this.apiUrl}/security-questions`);
  }

  verifySecurityQuestions(data: any) {
    return this.http.post<unknown>(`${this.apiUrl}/security-questions/verify`, data);
  }
}
