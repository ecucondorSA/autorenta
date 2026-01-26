import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../../core/models/security.model';
import { Segment } from '../../../../../core/models/segment.model';

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

  addSecurity(security: Security): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/securities`, security);
  }

  updateSecurity(id: string, security: Security): Observable<Security> {
    return this.http.put<Security>(`${this.apiUrl}/securities/${id}`, security);
  }

  deleteSecurity(id: string): Observable<Security> {
    return this.http.delete<Security>(`${this.apiUrl}/securities/${id}`);
  }

  getSegments(): Observable<Segment[]> {
    return this.http.get<Segment[]>(`${this.apiUrl}/segments`);
  }

  getSegment(id: string): Observable<Segment> {
    return this.http.get<Segment>(`${this.apiUrl}/segments/${id}`);
  }

  addSegment(segment: Segment): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiUrl}/segments`, segment);
  }

  updateSegment(id: string, segment: Segment): Observable<Segment> {
    return this.http.put<Segment>(`${this.apiUrl}/segments/${id}`, segment);
  }

  deleteSegment(id: string): Observable<Segment> {
    return this.http.delete<Segment>(`${this.apiUrl}/segments/${id}`);
  }

  runSecurity(securityId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/${securityId}/run`, payload);
  }

  runSegment(segmentId: string, payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/segments/${segmentId}/run`, payload);
  }

  getSecurityResults(securityId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/securities/${securityId}/results`);
  }

  getSegmentResults(segmentId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/segments/${segmentId}/results`);
  }

  approveSecurityResult(securityId: string, resultId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/${securityId}/results/${resultId}/approve`, {});
  }

  rejectSecurityResult(securityId: string, resultId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/${securityId}/results/${resultId}/reject`, {});
  }

  approveSegmentResult(segmentId: string, resultId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/segments/${segmentId}/results/${resultId}/approve`, {});
  }

  rejectSegmentResult(segmentId: string, resultId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/segments/${segmentId}/results/${resultId}/reject`, {});
  }
}
