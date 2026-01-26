import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'apps/web/src/environments/environment';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private readonly apiUrl = environment.apiUrl;
  private _isScanning = new BehaviorSubject<boolean>(false);
  public isScanning$: Observable<boolean> = this._isScanning.asObservable();

  constructor(private http: HttpClient) {}

  startScanning(): Observable<any> {
    this._isScanning.next(true);
    return this.http.post(`${this.apiUrl}/security/scan`, {}).pipe(
      tap(() => {
        this._isScanning.next(true);
      })
    );
  }

  getScanResults(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/scan-results`);
  }

  getSystemInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/system-info`);
  }

  getSecurityRecommendations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/recommendations`);
  }

  getVulnerabilities(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/vulnerabilities`);
  }

  getFirewallStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/firewall-status`);
  }

  getAntivirusStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/antivirus-status`);
  }

  getDiskEncryptionStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/disk-encryption-status`);
  }

  getSoftwareUpdates(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/software-updates`);
  }

  getAccountSecuritySettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/account-security-settings`);
  }

  getNetworkSecuritySettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/network-security-settings`);
  }

  getPrivacySettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/privacy-settings`);
  }

  getDeviceSecuritySettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/device-security-settings`);
  }

  performSecurityCheck(): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/perform-check`, {});
  }

  // Example error handling (adjust as needed)
  exampleApiCall(): Observable<any> {
    return this.http.get(`${this.apiUrl}/some-endpoint`).pipe(
      tap({
        next: (_res) => console.log('API call successful'),
        error: (_err) => console.error('API call failed'),
      })
    );
  }

  // Example POST request
  examplePostApiCall(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/some-endpoint`, data).pipe(
      tap({
        next: (_res) => console.log('POST API call successful'),
        error: (_err) => console.error('POST API call failed'),
      })
    );
  }

  getLogs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/logs`);
  }

  getThreatIntelligenceFeed(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/threat-intelligence-feed`);
  }

  generateReport(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/generate-report`);
  }

  restoreDefaultSettings(): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/restore-defaults`, {});
  }

  // Simulate a long-running task
  simulateLongTask(): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/simulate-long-task`, {});
  }

  // Get a list of available security tools
  getSecurityTools(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/tools`);
  }

  // Update a security tool
  updateSecurityTool(toolId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/security/tools/${toolId}`, {});
  }

  // Uninstall a security tool
  uninstallSecurityTool(toolId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/tools/${toolId}`);
  }

  // Schedule a security scan
  scheduleSecurityScan(schedule: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/scan-schedule`, schedule);
  }

  // Get the scan schedule
  getSecurityScanSchedule(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/scan-schedule`);
  }

  // Cancel a scheduled scan
  cancelSecurityScan(scheduleId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/scan-schedule/${scheduleId}`);
  }

  // Get a list of quarantined files
  getQuarantinedFiles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/quarantine`);
  }

  // Restore a quarantined file
  restoreQuarantinedFile(fileId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/quarantine/${fileId}/restore`, {});
  }

  // Delete a quarantined file
  deleteQuarantinedFile(fileId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/quarantine/${fileId}`);
  }

  // Get a list of blocked websites
  getBlockedWebsites(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/blocked-websites`);
  }

  // Add a website to the blocked list
  addBlockedWebsite(website: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/blocked-websites`, { website });
  }

  // Remove a website from the blocked list
  removeBlockedWebsite(websiteId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/blocked-websites/${websiteId}`);
  }

  // Get a list of trusted applications
  getTrustedApplications(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/trusted-applications`);
  }

  // Add an application to the trusted list
  addTrustedApplication(applicationPath: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/trusted-applications`, { applicationPath });
  }

  // Remove an application from the trusted list
  removeTrustedApplication(applicationId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/trusted-applications/${applicationId}`);
  }

  // Get a list of network connections
  getNetworkConnections(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/network-connections`);
  }

  // Monitor a network connection
  monitorNetworkConnection(connectionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/network-connections/${connectionId}/monitor`, {});
  }

  // Block a network connection
  blockNetworkConnection(connectionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/network-connections/${connectionId}/block`, {});
  }

  // Get a list of active processes
  getActiveProcesses(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/active-processes`);
  }

  // Terminate a process
  terminateProcess(processId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/active-processes/${processId}/terminate`, {});
  }

  // Get a list of startup programs
  getStartupPrograms(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/startup-programs`);
  }

  // Disable a startup program
  disableStartupProgram(programId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/startup-programs/${programId}/disable`, {});
  }

  // Enable a startup program
  enableStartupProgram(programId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/startup-programs/${programId}/enable`, {});
  }

  // Get a list of browser extensions
  getBrowserExtensions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/browser-extensions`);
  }

  // Disable a browser extension
  disableBrowserExtension(extensionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/browser-extensions/${extensionId}/disable`, {});
  }

  // Enable a browser extension
  enableBrowserExtension(extensionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/browser-extensions/${extensionId}/enable`, {});
  }

  // Get a list of installed fonts
  getInstalledFonts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/installed-fonts`);
  }

  // Remove an installed font
  removeInstalledFont(fontId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/installed-fonts/${fontId}`);
  }

  // Get a list of installed codecs
  getInstalledCodecs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/installed-codecs`);
  }

  // Remove an installed codec
  removeInstalledCodec(codecId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/installed-codecs/${codecId}`);
  }

  // Get a list of scheduled tasks
  getScheduledTasks(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/scheduled-tasks`);
  }

  // Disable a scheduled task
  disableScheduledTask(taskId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/scheduled-tasks/${taskId}/disable`, {});
  }

  // Enable a scheduled task
  enableScheduledTask(taskId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/scheduled-tasks/${taskId}/enable`, {});
  }

  // Get a list of system services
  getSystemServices(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/system-services`);
  }

  // Disable a system service
  disableSystemService(serviceId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/system-services/${serviceId}/disable`, {});
  }

  // Enable a system service
  enableSystemService(serviceId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/security/system-services/${serviceId}/enable`, {});
  }
}
