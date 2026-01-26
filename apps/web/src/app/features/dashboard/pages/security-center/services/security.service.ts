import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityIncidents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/security-incidents`);
  }

  getSecurityIncident(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security-incidents/${id}`);
  }

  createSecurityIncident(incident: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security-incidents`, incident);
  }

  updateSecurityIncident(id: string, incident: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/security-incidents/${id}`, incident);
  }

  deleteSecurityIncident(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/security-incidents/${id}`);
  }

  // Example method to fetch users (replace with actual implementation)
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  // Example method to fetch roles (replace with actual implementation)
  getRoles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/roles`);
  }

  // Example method to fetch permissions (replace with actual implementation)
  getPermissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/permissions`);
  }

  // Example method to assign role to user (replace with actual implementation)
  assignRoleToUser(userId: string, roleId: string): Observable<any> {
    const payload = { userId, roleId };
    return this.http.post<any>(`${this.apiUrl}/user-roles`, payload);
  }

    // Example method to revoke role from user (replace with actual implementation)
  revokeRoleFromUser(userId: string, roleId: string): Observable<any> {
    const payload = { userId, roleId };
    return this.http.delete<any>(`${this.apiUrl}/user-roles?userId=${userId}&roleId=${roleId}`);
  }

  // Example method to check user permission (replace with actual implementation)
  checkUserPermission(userId: string, permission: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/user-permissions?userId=${userId}&permission=${permission}`);
  }

  // Placeholder for fetching audit logs
  getAuditLogs(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/audit-logs`);
  }

  // Placeholder for performing a security scan
  performSecurityScan(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security-scan`, {});
  }

  // Placeholder for fetching security reports
  getSecurityReports(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security-reports`);
  }
}
