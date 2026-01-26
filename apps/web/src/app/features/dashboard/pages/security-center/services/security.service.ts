import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

interface EmptyInterface {}

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security`);
  }

  updateSecuritySetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/security/${settingId}`, { value });
  }

  generateSafeUrl(url: string): any {
    // Implementation to generate safe URL
    return null;
  }
}
