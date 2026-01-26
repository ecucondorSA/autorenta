import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security`);
  }

  updateSecuritySetting(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/security`, data);
  }

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  // ngOnInit(): void {
  // }
}
