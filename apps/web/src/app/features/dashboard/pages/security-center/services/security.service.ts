import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getHeaders() {
    const token = localStorage.getItem('authToken');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  // Get All Connected Devices
  getAllConnectedDevices(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/devices`, this.getHeaders());
  }

  // Get Connected Device By Id
  getConnectedDeviceById(deviceId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/devices/${deviceId}`, this.getHeaders());
  }

  // Add Connected Device
  addConnectedDevice(deviceData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/devices`, deviceData, this.getHeaders());
  }

  // Update Connected Device
  updateConnectedDevice(deviceId: string, deviceData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/security/devices/${deviceId}`, deviceData, this.getHeaders());
  }

  // Delete Connected Device
  deleteConnectedDevice(deviceId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/devices/${deviceId}`, this.getHeaders());
  }

  // Get All Security Logs
  getAllSecurityLogs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/logs`, this.getHeaders());
  }

    // Get Security Log by Id
  getSecurityLogById(logId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/logs/${logId}`, this.getHeaders());
  }

  // Add Security Log
  addSecurityLog(logData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/logs`, logData, this.getHeaders());
  }

  // Update Security Log
  updateSecurityLog(logId: string, logData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/security/logs/${logId}`, logData, this.getHeaders());
  }

  // Delete Security Log
  deleteSecurityLog(logId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/logs/${logId}`, this.getHeaders());
  }

  // Get All Security Threats
  getAllSecurityThreats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/threats`, this.getHeaders());
  }

  // Get Security Threat by Id
  getSecurityThreatById(threatId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/threats/${threatId}`, this.getHeaders());
  }

  // Add Security Threat
  addSecurityThreat(threatData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/threats`, threatData, this.getHeaders());
  }

  // Update Security Threat
  updateSecurityThreat(threatId: string, threatData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/security/threats/${threatId}`, threatData, this.getHeaders());
  }

  // Delete Security Threat
  deleteSecurityThreat(threatId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/threats/${threatId}`, this.getHeaders());
  }

  // Simulate Security Scan
  simulateSecurityScan(): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/scan/simulate`, {}, this.getHeaders()).pipe(
      (res: any) => {
        return res;
      },
      (err: any) => {
        return err;
      }
    );
  }

  // Get Security Scan Results
  getSecurityScanResults(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/scan/results`, this.getHeaders());
  }

  // Trigger Security Mitigation
  triggerSecurityMitigation(): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/security/mitigation/trigger`, {}, this.getHeaders())
      .pipe(
        (res: any) => {
          return res;
        },
        (err: any) => {
          return err;
        }
      );
  }

  // Get Security Mitigation Status
  getSecurityMitigationStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/mitigation/status`, this.getHeaders());
  }
}
