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

  getSecurityAlerts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/alerts`);
  }

  getSecurityRecommendations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/recommendations`);
  }

  updateSecuritySetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/security/settings/${settingId}`, { value });
  }

  getSecuritySetting(settingId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/settings/${settingId}`);
  }

  getAllSecuritySettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/security/settings`);
  }

  // New methods to fetch and update MFA settings
  getMFASettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/mfa/settings`);
  }

  updateMFASetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/mfa/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Privacy settings
  getPrivacySettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/privacy/settings`);
  }

  updatePrivacySetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/privacy/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Data Sharing settings
  getDataSharingSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/data-sharing/settings`);
  }

  updateDataSharingSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/data-sharing/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Communication Preferences settings
  getCommunicationPreferencesSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/communication-preferences/settings`);
  }

  updateCommunicationPreferencesSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/communication-preferences/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Payment settings
  getPaymentSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/payment/settings`);
  }

  updatePaymentSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/payment/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Legal settings
  getLegalSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/legal/settings`);
  }

  updateLegalSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/legal/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Terms of Service settings
  getTermsOfServiceSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/terms-of-service/settings`);
  }

  updateTermsOfServiceSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/terms-of-service/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Cookie settings
  getCookieSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/cookie/settings`);
  }

  updateCookieSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/cookie/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Session settings
  getSessionSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/session/settings`);
  }

  updateSessionSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/session/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Connected Apps settings
  getConnectedAppsSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/connected-apps/settings`);
  }

  updateConnectedAppsSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/connected-apps/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Authorized Devices settings
  getAuthorizedDevicesSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/authorized-devices/settings`);
  }

  updateAuthorizedDevicesSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/authorized-devices/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Account Activity settings
  getAccountActivitySettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/account-activity/settings`);
  }

  updateAccountActivitySetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/account-activity/settings/${settingId}`, { value });
  }

  // Methods to fetch and update App Integrations settings
  getAppIntegrationsSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/app-integrations/settings`);
  }

  updateAppIntegrationsSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/app-integrations/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Third-Party Services settings
  getThirdPartyServicesSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/third-party-services/settings`);
  }

  updateThirdPartyServicesSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/third-party-services/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Export Data settings
  getExportDataSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/export-data/settings`);
  }

  updateExportDataSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/export-data/settings/${settingId}`, { value });
  }

  // Methods to fetch and update Delete Account settings
  getDeleteAccountSettings(): Observable<any> {
    return this.http.get(`${this.apiUrl}/delete-account/settings`);
  }

  updateDeleteAccountSetting(settingId: string, value: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/delete-account/settings/${settingId}`, { value });
  }
}
