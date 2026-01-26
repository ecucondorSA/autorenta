import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../core/models/security.model';
import { Segment } from '../../../../core/models/segment.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurity(company_id: number): Observable<Security[]> {
    const url = `${this.apiUrl}/companies/${company_id}/security`;
    return this.http.get<Security[]>(url);
  }

  getSecurityById(company_id: number, security_id: number): Observable<Security> {
    const url = `${this.apiUrl}/companies/${company_id}/security/${security_id}`;
    return this.http.get<Security>(url);
  }

  addSecurity(company_id: number, security: Security): Observable<Security> {
    const url = `${this.apiUrl}/companies/${company_id}/security`;
    return this.http.post<Security>(url, security);
  }

  updateSecurity(company_id: number, security_id: number, security: Security): Observable<Security> {
    const url = `${this.apiUrl}/companies/${company_id}/security/${security_id}`;
    return this.http.put<Security>(url, security);
  }

  deleteSecurity(company_id: number, security_id: number): Observable<Security> {
    const url = `${this.apiUrl}/companies/${company_id}/security/${security_id}`;
    return this.http.delete<Security>(url);
  }

  getSegment(company_id: number): Observable<Segment[]> {
    const url = `${this.apiUrl}/companies/${company_id}/segments`;
    return this.http.get<Segment[]>(url);
  }

  getSegmentById(company_id: number, segment_id: number): Observable<Segment> {
    const url = `${this.apiUrl}/companies/${company_id}/segments/${segment_id}`;
    return this.http.get<Segment>(url);
  }

  addSegment(company_id: number, segment: Segment): Observable<Segment> {
    const url = `${this.apiUrl}/companies/${company_id}/segments`;
    return this.http.post<Segment>(url, segment);
  }

  updateSegment(company_id: number, segment_id: number, segment: Segment): Observable<Segment> {
    const url = `${this.apiUrl}/companies/${company_id}/segments/${segment_id}`;
    return this.http.put<Segment>(url, segment);
  }

  deleteSegment(company_id: number, segment_id: number): Observable<Segment> {
    const url = `${this.apiUrl}/companies/${company_id}/segments/${segment_id}`;
    return this.http.delete<Segment>(url);
  }

  uploadFile(file: File, company_id: number, segment_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/segments/${segment_id}/upload`;
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(url, formData);
  }

  downloadTemplate(company_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/segments/template`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/vnd.ms-excel',
    });

    return this.http.get(url, { headers: headers, responseType: 'blob' });
  }

  processSegment(company_id: number, segment_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/segments/${segment_id}/process`;
    return this.http.post(url, {});
  }

  getSegmentProcessStatus(company_id: number, segment_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/segments/${segment_id}/process/status`;
    return this.http.get(url);
  }

  retrySegmentProcess(company_id: number, segment_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/segments/${segment_id}/process/retry`;
    return this.http.post(url, {});
  }

  stopSegmentProcess(company_id: number, segment_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/segments/${segment_id}/process/stop`;
    return this.http.post(url, {});
  }

  getSecurityProcessStatus(company_id: number, security_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/${security_id}/process/status`;
    return this.http.get(url);
  }

  retrySecurityProcess(company_id: number, security_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/${security_id}/process/retry`;
    return this.http.post(url, {});
  }

  stopSecurityProcess(company_id: number, security_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/${security_id}/process/stop`;
    return this.http.post(url, {});
  }

  bulkSecurityProcess(company_id: number, file: File): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/bulk/process`;
    const formData: FormData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post(url, formData);
  }

  getSecurityBulkProcessStatus(company_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/bulk/process/status`;
    return this.http.get(url);
  }

  downloadSecurityTemplate(company_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/template`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/vnd.ms-excel',
    });

    return this.http.get(url, { headers: headers, responseType: 'blob' });
  }

  getSecurityBulkProcessResult(company_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/bulk/process/result`;
    return this.http.get(url, { responseType: 'blob' });
  }

  downloadSecurityBulkProcessResult(company_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/bulk/process/result`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/vnd.ms-excel',
    });

    return this.http.get(url, { headers: headers, responseType: 'blob' });
  }

  getSecurityBulkProcessErrors(company_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/bulk/process/errors`;
    return this.http.get(url, { responseType: 'blob' });
  }

  downloadSecurityBulkProcessErrors(company_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/bulk/process/errors`;

    const headers = new HttpHeaders({
      'Content-Type': 'application/vnd.ms-excel',
    });

    return this.http.get(url, { headers: headers, responseType: 'blob' });
  }

  // Methods for handling security alerts
  getSecurityAlerts(company_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/alerts`;
    return this.http.get(url);
  }

  getSecurityAlertById(company_id: number, alert_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/alerts/${alert_id}`;
    return this.http.get(url);
  }

  createSecurityAlert(company_id: number, alert: any): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/alerts`;
    return this.http.post(url, alert);
  }

  updateSecurityAlert(company_id: number, alert_id: number, alert: any): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/alerts/${alert_id}`;
    return this.http.put(url, alert);
  }

  deleteSecurityAlert(company_id: number, alert_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/alerts/${alert_id}`;
    return this.http.delete(url);
  }

  // Methods for handling security configurations
  getSecurityConfigurations(company_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/configurations`;
    return this.http.get(url);
  }

  getSecurityConfigurationById(company_id: number, config_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/configurations/${config_id}`;
    return this.http.get(url);
  }

  createSecurityConfiguration(company_id: number, config: any): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/configurations`;
    return this.http.post(url, config);
  }

  updateSecurityConfiguration(company_id: number, config_id: number, config: any): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/configurations/${config_id}`;
    return this.http.put(url, config);
  }

  deleteSecurityConfiguration(company_id: number, config_id: number): Observable<any> {
    const url = `${this.apiUrl}/companies/${company_id}/security/configurations/${config_id}`;
    return this.http.delete(url);
  }
}
