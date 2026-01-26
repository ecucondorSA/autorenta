import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from '@auth0/auth0-angular';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  constructor(private http: HttpClient, private auth: AuthService) {}

  getSecurityEvents(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/events`, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error fetching security events:', error);
        return of(null);
      })
    );
  }

  getSecurityEvent(eventId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/events/${eventId}`, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error fetching security event:', error);
        return of(null);
      })
    );
  }

  createSecurityEvent(eventData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/events`, eventData, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error creating security event:', error);
        return of(null);
      })
    );
  }

  updateSecurityEvent(eventId: string, eventData: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/security/events/${eventId}`, eventData, this.httpOptions)
      .pipe(
        catchError((error) => {
          console.error('Error updating security event:', error);
          return of(null);
        })
      );
  }

  deleteSecurityEvent(eventId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/events/${eventId}`, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error deleting security event:', error);
        return of(null);
      })
    );
  }

  getUser(): Observable<any> {
    return this.auth.user$.pipe(
      map((user) => {
        return user;
      }),
      catchError((error) => {
        console.error('Error getting user:', error);
        return of(null);
      })
    );
  }

  getAccessToken(): Observable<string | null> {
    return this.auth.getAccessTokenSilently().pipe(
      catchError((_err) => {
        return of(null);
      })
    );
  }

  loginWithRedirect() {
    this.auth.loginWithRedirect();
  }

  logout() {
    this.auth.logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }

  //roles
  getRoles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/roles`, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error getting roles:', error);
        return of(null);
      })
    );
  }

  getRole(roleId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/roles/${roleId}`, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error getting role:', error);
        return of(null);
      })
    );
  }

  createRole(roleData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/roles`, roleData, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error creating role:', error);
        return of(null);
      })
    );
  }

  updateRole(roleId: string, roleData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/roles/${roleId}`, roleData, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error updating role:', error);
        return of(null);
      })
    );
  }

  deleteRole(roleId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/roles/${roleId}`, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error deleting role:', error);
        return of(null);
      })
    );
  }

  //permissions
  getPermissions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/permissions`, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error getting permissions:', error);
        return of(null);
      })
    );
  }

  getPermission(permissionId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/permissions/${permissionId}`, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error getting permission:', error);
        return of(null);
      })
    );
  }

  createPermission(permissionData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/permissions`, permissionData, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error creating permission:', error);
        return of(null);
      })
    );
  }

  updatePermission(permissionId: string, permissionData: any): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/permissions/${permissionId}`, permissionData, this.httpOptions)
      .pipe(
        catchError((error) => {
          console.error('Error updating permission:', error);
          return of(null);
        })
      );
  }

  deletePermission(permissionId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/permissions/${permissionId}`, this.httpOptions).pipe(
      catchError((error) => {
        console.error('Error deleting permission:', error);
        return of(null);
      })
    );
  }
}
