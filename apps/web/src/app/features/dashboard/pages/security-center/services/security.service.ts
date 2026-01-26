import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  constructor(private http: HttpClient) {}

  getSecurityQuestions(): Observable<any> {
    return this.http.get('/api/security/questions');
  }

  verifySecurityQuestions(answers: any): Observable<any> {
    return this.http.post('/api/security/verify', answers);
  }

  updateSecurityQuestions(answers: any): Observable<any> {
    return this.http.put('/api/security/questions', answers);
  }

  enableTwoFactorAuth(): Observable<any> {
    return this.http.post('/api/two-factor/enable', {});
  }

  disableTwoFactorAuth(): Observable<any> {
    return this.http.post('/api/two-factor/disable', {});
  }

  getTwoFactorAuthStatus(): Observable<any> {
    return this.http.get('/api/two-factor/status');
  }

  generateRecoveryCodes(): Observable<any> {
    return this.http.post('/api/two-factor/recovery-codes', {});
  }

  verifyRecoveryCode(code: string): Observable<any> {
    return this.http.post('/api/two-factor/recovery-codes/verify', { code });
  }

  getSecurityOverview(): Observable<any> {
    return this.http.get('/api/security/overview');
  }

  getAccountActivity(): Observable<any> {
    return this.http.get('/api/security/activity');
  }

  // Example of a method that returns a specific type
  getSecuritySettings(): Observable<SecuritySettings> {
    return this.http.get<SecuritySettings>('/api/security/settings');
  }

  // Example of a method that takes a specific type
  updateSecuritySettings(settings: SecuritySettings): Observable<any> {
    return this.http.put('/api/security/settings', settings);
  }

  // Example of a method that returns a specific type
  getIpAddressInfo(ipAddress: string): Observable<IpAddressInfo> {
    return this.http.get<IpAddressInfo>(`/api/ip-address-info/${ipAddress}`);
  }

  // Example of a method that returns a specific type
  getDeviceDetails(deviceId: string): Observable<DeviceDetails> {
    return this.http.get<DeviceDetails>(`/api/device-details/${deviceId}`);
  }

  // Example of a method that returns a specific type
  getBreachedPasswords(password: string): Observable<BreachedPasswords> {
    return this.http.post<BreachedPasswords>('/api/breached-passwords', { password });
  }

  // Example of a method that returns a specific type
  getCompromisedAccounts(): Observable<CompromisedAccounts> {
    return this.http.get<CompromisedAccounts>('/api/compromised-accounts');
  }

  // Example of a method that returns a specific type
  getVulnerabilityAssessment(): Observable<VulnerabilityAssessment> {
    return this.http.get<VulnerabilityAssessment>('/api/vulnerability-assessment');
  }
}

// Define interfaces for the data types
interface SecuritySettings {
  // Define properties here
}

interface IpAddressInfo {
  // Define properties here
}

interface DeviceDetails {
  // Define properties here
}

interface BreachedPasswords {
  // Define properties here
}

interface CompromisedAccounts {
  // Define properties here
}

interface VulnerabilityAssessment {
  // Define properties here
}