import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<any> {
    return this.http.get('/api/security');
  }

  updateSecuritySetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`/api/security/${settingId}`, { value });
  }
}
