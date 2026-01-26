import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Security } from '../../../../core/models/security.model';
import { Segment } from '../../../../core/models/segment.model';

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

  updateSecurity(security: Security): Observable<Security> {
    return this.http.put<Security>(`${this.apiUrl}/securities/${security.id}`, security);
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

  createSegment(segment: Segment): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiUrl}/segments`, segment);
  }

  updateSegment(segment: Segment): Observable<Segment> {
    return this.http.put<Segment>(`${this.apiUrl}/segments/${segment.id}`, segment);
  }

  deleteSegment(id: string): Observable<Segment> {
    return this.http.delete<Segment>(`${this.apiUrl}/segments/${id}`);
  }

  getSecurityForSegment(segmentId: string): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/segments/${segmentId}/securities`)
      .pipe(
        map((res: any) => {
          return res;
        })
      );
  }

  addSecurityToSegment(segmentId: string, securityId: string): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/segments/${segmentId}/securities/${securityId}`, {})
      .pipe(
        map((res: any) => {
          return res;
        })
      );
  }

  removeSecurityFromSegment(segmentId: string, securityId: string): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/segments/${segmentId}/securities/${securityId}`)
      .pipe(
        map((res: any) => {
          return res;
        })
      );
  }

  getUnassignedSecurities(segmentId: string): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/segments/${segmentId}/securities/unassigned`)
      .pipe(
        map((res: any) => {
          return res;
        })
      );
  }

  bulkAddSecuritiesToSegment(segmentId: string, securityIds: string[]): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/segments/${segmentId}/securities/bulk`, securityIds)
      .pipe(
        map((res: any) => {
          return res;
        })
      );
  }

  bulkRemoveSecuritiesFromSegment(segmentId: string, securityIds: string[]): Observable<any> {
    return this.http
      .delete<any>(`${this.apiUrl}/segments/${segmentId}/securities/bulk`, { body: securityIds })
      .pipe(
        map((res: any) => {
          return res;
        })
      );
  }

  runSecurityScan(securityId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/${securityId}/scan`, {}).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  getSecurityScanResults(securityId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/securities/${securityId}/scan`).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  approveSecurity(securityId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/${securityId}/approve`, {}).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  rejectSecurity(securityId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/${securityId}/reject`, {}).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  resetSecurity(securityId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/${securityId}/reset`, {}).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  bulkApproveSecurities(securityIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/bulk/approve`, securityIds).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  bulkRejectSecurities(securityIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/bulk/reject`, securityIds).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  bulkResetSecurities(securityIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/bulk/reset`, securityIds).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  bulkRunSecurityScan(securityIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/securities/bulk/scan`, securityIds).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  bulkDeleteSecurities(securityIds: string[]): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/securities/bulk`, { body: securityIds }).pipe(
      map((res: any) => {
        return res;
      })
    );
  }

  getSecurityHistory(securityId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/securities/${securityId}/history`).pipe(
      map((res: any) => {
        return res;
      },
      (err: any) => {
        console.error(err);
      })
    );
  }

  getSegmentHistory(segmentId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/segments/${segmentId}/history`).pipe(
      map((res: any) => {
        return res;
      },
      (err: any) => {
        console.error(err);
      })
    );
  }
}
