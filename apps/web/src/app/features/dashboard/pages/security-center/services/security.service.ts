import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../../../core/models/security.model';
import { Province } from '../../../../../../core/models/province.model';
import { Review } from '../../../../../../core/models/review.model';
import { Segment } from '../../../../../../core/models/segment.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurities(): Observable<Security[]> {
    return this.http.get<Security[]>(`${this.apiUrl}/securities`);
  }

  getSecurity(id: string): Observable<Security> {
    return this.http.get<Security>(`${this.apiUrl}/securities/${id}`);
  }

  createSecurity(security: Security): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/securities`, security);
  }

  updateSecurity(id: string, security: Security): Observable<Security> {
    return this.http.put<Security>(`${this.apiUrl}/securities/${id}`, security);
  }

  deleteSecurity(id: string): Observable<Security> {
    return this.http.delete<Security>(`${this.apiUrl}/securities/${id}`);
  }

  getProvinces(): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.apiUrl}/provinces`);
  }

  getProvince(id: string): Observable<Province> {
    return this.http.get<Province>(`${this.apiUrl}/provinces/${id}`);
  }

  createProvince(province: Province): Observable<Province> {
    return this.http.post<Province>(`${this.apiUrl}/provinces`, province);
  }

  updateProvince(id: string, province: Province): Observable<Province> {
    return this.http.put<Province>(`${this.apiUrl}/provinces/${id}`, province);
  }

  deleteProvince(id: string): Observable<Province> {
    return this.http.delete<Province>(`${this.apiUrl}/provinces/${id}`);
  }

  getReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/reviews`);
  }

  getReview(id: string): Observable<Review> {
    return this.http.get<Review>(`${this.apiUrl}/reviews/${id}`);
  }

  createReview(review: Review): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/reviews`, review);
  }

  updateReview(id: string, review: Review): Observable<Review> {
    return this.http.put<Review>(`${this.apiUrl}/reviews/${id}`, review);
  }

  deleteReview(id: string): Observable<Review> {
    return this.http.delete<Review>(`${this.apiUrl}/reviews/${id}`);
  }

  getSegments(): Observable<Segment[]> {
    return this.http.get<Segment[]>(`${this.apiUrl}/segments`);
  }

  getSegment(id: string): Observable<Segment> {
    return this.http.get<Segment>(`${this.apiUrl}/segments/${id}`);
  }

  createSegment(segment: Segment): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiUrl}/segments`, segment);
  }

  updateSegment(id: string, segment: Segment): Observable<Segment> {
    return this.http.put<Segment>(`${this.apiUrl}/segments/${id}`, segment);
  }

  deleteSegment(id: string): Observable<Segment> {
    return this.http.delete<Segment>(`${this.apiUrl}/segments/${id}`);
  }

  uploadImage(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  getUploadedImage(imageId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/uploads/${imageId}`);
  }

  resizeImage(imageId: string, width: number, height: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resize/${imageId}?width=${width}&height=${height}`);
  }

  getImageMetadata(imageId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/metadata/${imageId}`);
  }

  generateThumbnail(imageId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/thumbnail/${imageId}`);
  }

  backupDatabase(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/backup`, {});
  }

  restoreDatabase(backupFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('backup', backupFile);

    return this.http.post<any>(`${this.apiUrl}/restore`, formData);
  }

  runDiagnostics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/diagnostics`);
  }

  analyzeLogs(logFile: File): Observable<any> {
    const formData = new FormData();
    formData.append('log', logFile);

    return this.http.post<any>(`${this.apiUrl}/analyze`, formData);
  }

  optimizePerformance(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/optimize`, {});
  }

  monitorSystemHealth(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/health`);
  }

  getSecurityReports(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reports`);
  }

  generateReport(reportType: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/reports/generate`, { type: reportType });
  }

  scheduleTask(taskDetails: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tasks/schedule`, taskDetails);
  }

  getTaskStatus(taskId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tasks/${taskId}`);
  }

  cancelTask(taskId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tasks/${taskId}/cancel`, {});
  }

  getSystemStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics`);
  }

  getAuditLogs(query: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/audit`, query);
  }

  // Example error handling (adjust as needed)
  exampleApiCall(): Observable<any> {
    return new Observable((observer) => {
      this.http.get<any>('/api/example').subscribe(
        (res) => {
          console.log('Success:', res);
          observer.next(res);
          observer.complete();
        },
        (err) => {
          console.error('Error:', err);
          observer.error(err);
        }
      );
    });
  }

  simulateDataBreach(): Observable<any> {
    return new Observable((observer) => {
      this.http.post<any>('/api/simulate-breach', {}).subscribe(
        (res) => {
          console.log('Success:', res);
          observer.next(res);
          observer.complete();
        },
        (err) => {
          console.error('Error:', err);
          observer.error(err);
        }
      );
    });
  }

  performVulnerabilityScan(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/vulnerability-scan`);
  }

  applySecurityPatch(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security-patch`, {});
  }

  configureFirewallRules(rules: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/firewall-rules`, rules);
  }

  monitorNetworkTraffic(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/network-traffic`);
  }

  detectIntrusionAttempts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/intrusion-attempts`);
  }

  encryptSensitiveData(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/encrypt-data`, {});
  }

  implementAccessControls(controls: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/access-controls`, controls);
  }

  conductSecurityAwarenessTraining(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security-training`, {});
  }

  respondToSecurityIncidents(incidentDetails: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security-incidents`, incidentDetails);
  }

  performRegularSecurityAudits(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security-audits`);
  }
}
