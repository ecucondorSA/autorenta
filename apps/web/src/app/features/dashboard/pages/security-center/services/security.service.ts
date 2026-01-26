import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // User Activity
  getUserActivity(page: number, pageSize: number): Observable<any> {
    const url = `${this.apiUrl}/api/v1/activity?page=${page}&pageSize=${pageSize}`;
    return this.http.get(url);
  }

  // Failed Logins
  getFailedLogins(page: number, pageSize: number): Observable<any> {
    const url = `${this.apiUrl}/api/v1/failed-logins?page=${page}&pageSize=${pageSize}`;
    return this.http.get(url);
  }

  // Get all devices
  getAllDevices(page: number, pageSize: number): Observable<any> {
    const url = `${this.apiUrl}/api/v1/devices?page=${page}&pageSize=${pageSize}`;
    return this.http.get(url);
  }

  // Get device by id
  getDeviceById(deviceId: string): Observable<any> {
    const url = `${this.apiUrl}/api/v1/devices/${deviceId}`;
    return this.http.get(url);
  }

  // Block device
  blockDevice(deviceId: string): Observable<any> {
    const url = `${this.apiUrl}/api/v1/devices/${deviceId}/block`;
    return this.http.post(url, {});
  }

  // Unblock device
  unblockDevice(deviceId: string): Observable<any> {
    const url = `${this.apiUrl}/api/v1/devices/${deviceId}/unblock`;
    return this.http.post(url, {});
  }

  // Get all trusted locations
  getAllTrustedLocations(page: number, pageSize: number): Observable<any> {
    const url = `${this.apiUrl}/api/v1/trusted-locations?page=${page}&pageSize=${pageSize}`;
    return this.http.get(url);
  }

  // Add trusted location
  addTrustedLocation(locationData: any): Observable<any> {
    const url = `${this.apiUrl}/api/v1/trusted-locations`;
    return this.http.post(url, locationData);
  }

  // Delete trusted location
  deleteTrustedLocation(locationId: string): Observable<any> {
    const url = `${this.apiUrl}/api/v1/trusted-locations/${locationId}`;
    return this.http.delete(url);
  }

  // Get all 2FA methods
  getAll2FAMethods(): Observable<any> {
    const url = `${this.apiUrl}/api/v1/two-factor-auth`;
    return this.http.get(url);
  }

  // Add 2FA method
  add2FAMethod(methodData: any): Observable<any> {
    const url = `${this.apiUrl}/api/v1/two-factor-auth`;
    return this.http.post(url, methodData);
  }

  // Delete 2FA method
  delete2FAMethod(methodId: string): Observable<any> {
    const url = `${this.apiUrl}/api/v1/two-factor-auth/${methodId}`;
    return this.http.delete(url);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Get backup codes
  getBackupCodes(): Observable<any> {
    const url = `${this.apiUrl}/api/v1/backup-codes`;
    return this.http.get(url);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Generate backup codes
  generateBackupCodes(): Observable<any> {
    const url = `${this.apiUrl}/api/v1/backup-codes/generate`;
    return this.http.post(url, {});
  }
}
