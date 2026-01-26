import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { SegmentModel } from '../../../core/models/segment.model';
import { SecurityModel } from '../../../core/models/security.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;
  private securityDataSubject = new BehaviorSubject<SecurityModel | null>(null);
  public securityData$ = this.securityDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<SecurityModel> {
    return this.http.get<SecurityModel>(`${this.apiUrl}/security`).pipe(
      tap((data) => {
        this.securityDataSubject.next(data);
      })
    );
  }

  getSegmentData(segmentId: string): Observable<SegmentModel> {
    return this.http.get<SegmentModel>(`${this.apiUrl}/security/segment/${segmentId}`);
  }

  updateSegment(segmentId: string, segment: SegmentModel): Observable<SegmentModel> {
    return this.http.put<SegmentModel>(`${this.apiUrl}/security/segment/${segmentId}`, segment);
  }

  createSegment(segment: SegmentModel): Observable<SegmentModel> {
    return this.http.post<SegmentModel>(`${this.apiUrl}/security/segment`, segment);
  }

  deleteSegment(segmentId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/security/segment/${segmentId}`);
  }

  getAnonymizationSettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/anonymization`);
  }

  updateAnonymizationSettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/security/anonymization`, settings);
  }

  getBreachSimulation(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/breach-simulation`);
  }

  runBreachSimulation(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/breach-simulation`, {});
  }

  getSystemLogs(page: number, pageSize: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/security/system-logs?page=${page}&pageSize=${pageSize}`)
      .pipe(
        map((res: any) => {
          return {
            data: res.data,
            total: res.total,
          };
        })
      );
  }

  clearSystemLogs(): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/security/system-logs`);
  }

  getSecurityOverview(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/overview`);
  }

  getSecurityControls(): Observable<any> {
    // TODO: Specify a different type than any
    return this.http.get<any>(`${this.apiUrl}/security/controls`);
  }

  updateSecurityControls(controls: any): Observable<any> {
    // TODO: Specify a different type than any
    return this.http.put<any>(`${this.apiUrl}/security/controls`, controls);
  }

  runSecurityScan(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/scan`, {});
  }

  getSecurityScanResults(page: number, pageSize: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/security/scan-results?page=${page}&pageSize=${pageSize}`)
      .pipe(
        map((res: any) => {
          return {
            data: res.data,
            total: res.total,
          };
        })
      );
  }

  getVulnerabilityData(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/vulnerabilities`);
  }

  resolveVulnerability(vulnerabilityId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/vulnerabilities/${vulnerabilityId}/resolve`, {});
  }

  getDlpIncidents(page: number, pageSize: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/security/dlp-incidents?page=${page}&pageSize=${pageSize}`)
      .pipe(
        map((res: any) => {
          return {
            data: res.data,
            total: res.total,
          };
        })
      );
  }

  getPrivacySettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/privacy`);
  }

  updatePrivacySettings(settings: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/security/privacy`, settings);
  }

  getComplianceReports(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/compliance`);
  }

  generateComplianceReport(reportType: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/compliance/${reportType}`, {});
  }

  getThreatIntelligence(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/threat-intelligence`);
  }

  getThreatActors(page: number, pageSize: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/security/threat-actors?page=${page}&pageSize=${pageSize}`)
      .pipe(
        map((res: any) => {
          return {
            data: res.data,
            total: res.total,
          };
        })
      );
  }

  getAttackSurface(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/attack-surface`);
  }

  getVulnerabilityAssessments(page: number, pageSize: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/security/vulnerability-assessments?page=${page}&pageSize=${pageSize}`)
      .pipe(
        map((res: any) => {
          return {
            data: res.data,
            total: res.total,
          };
        })
      );
  }

  runVulnerabilityAssessment(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/vulnerability-assessments`, {});
  }

  getIncidentResponsePlans(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/incident-response-plans`);
  }

  createIncidentResponsePlan(plan: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/incident-response-plans`, plan);
  }

  updateIncidentResponsePlan(planId: string, plan: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/security/incident-response-plans/${planId}`, plan);
  }

  deleteIncidentResponsePlan(planId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/security/incident-response-plans/${planId}`);
  }

  getSecurityTrainingPrograms(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/training-programs`);
  }

  assignSecurityTraining(programId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/training-programs/${programId}/assign/${userId}`, {});
  }

  getSecurityAudits(page: number, pageSize: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/security/audits?page=${page}&pageSize=${pageSize}`)
      .pipe(
        map((res: any) => {
          return {
            data: res.data,
            total: res.total,
          };
        })
      );
  }

  runSecurityAudit(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/security/audits`, {});
  }

  getCloudSecurityPosture(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/cloud-security-posture`);
  }

  getContainerSecurity(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/container-security`);
  }

  getNetworkSecurity(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/network-security`);
  }

  getEndpointSecurity(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/endpoint-security`);
  }

  getDataLossPrevention(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/data-loss-prevention`);
  }

  getIdentityAndAccessManagement(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/identity-and-access-management`);
  }

  getSecurityInformationAndEventManagement(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/siem`);
  }

  getThreatDetectionAndResponse(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/threat-detection-and-response`);
  }

  getVulnerabilityManagement(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/vulnerability-management`);
  }

  getSecurityOrchestrationAutomationAndResponse(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/soar`);
  }

  getSecurityAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/analytics`);
  }

  getSecurityIntelligence(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/security/intelligence`);
  }
}
