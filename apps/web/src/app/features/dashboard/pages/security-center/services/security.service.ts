import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../../core/models/security.model';
import { Review } from '../../../../../core/models/review.model';
import { Segment } from '../../../../../core/models/segment.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurity(id: number): Observable<Security> {
    return this.http.get<Security>(`${this.apiUrl}/api/security/${id}`);
  }

  updateSecurity(id: number, security: Security): Observable<Security> {
    return this.http.put<Security>(`${this.apiUrl}/api/security/${id}`, security);
  }

  createSecurity(security: Security): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/api/security`, security);
  }

  deleteSecurity(id: number): Observable<Security> {
    return this.http.delete<Security>(`${this.apiUrl}/api/security/${id}`);
  }

  getReviewsBySecurityId(id: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/api/security/${id}/reviews`);
  }

  getSegmentsBySecurityId(id: number): Observable<Segment[]> {
    return this.http.get<Segment[]>(`${this.apiUrl}/api/security/${id}/segments`);
  }

  addReviewToSecurity(id: number, review: Review): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/api/security/${id}/reviews`, review);
  }

  addSegmentToSecurity(id: number, segment: Segment): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiUrl}/api/security/${id}/segments`, segment);
  }

  getSecurityStatistics(securityId: number, startDate: string, endDate: string): Observable<any> {
    const url = `${this.apiUrl}/api/security/${securityId}/statistics?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get<any>(url);
  }

  getSecurityAnalytics(securityId: number, startDate: string, endDate: string): Observable<any> {
    const url = `${this.apiUrl}/api/security/${securityId}/analytics?startDate=${startDate}&endDate=${endDate}`;
    return this.http.get<any>(url);
  }

  runSecurityScan(securityId: number): Observable<any> {
    const url = `${this.apiUrl}/api/security/${securityId}/run-scan`;
    return this.http.post<any>(url, {});
  }

  getSecurityScanStatus(securityId: number): Observable<any> {
    const url = `${this.apiUrl}/api/security/${securityId}/scan-status`;
    return this.http.get<any>(url);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uploadSecurityFile(file: File, securityId: number): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return new Observable((observer) => {
      fetch(`${this.apiUrl}/api/security/${securityId}/upload`, {
        method: 'POST',
        body: formData,
      })
        .then((res) => {
          if (res.status === 200) {
            observer.next(res);
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            res.json().then((err) => {
              observer.error(err);
            });
          }
          observer.complete();
        })
        .catch((err) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          err.json().then((res) => {
            observer.error(res);
          });
        });
    });
  }
}
