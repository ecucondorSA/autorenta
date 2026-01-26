import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../../../core/models/security.model';
import { Segment } from '../../../../../../core/models/segment.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;
  private headers = new HttpHeaders().set(
    'Content-Type',
    'application/json; charset=UTF-8'
  );

  private securityDataSubject = new BehaviorSubject<Security | null>(null);
  securityData$ = this.securityDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<Security> {
    return this.http.get<Security>(`${this.apiUrl}/security`, { headers: this.headers }).pipe(
      tap((data) => {
        this.securityDataSubject.next(data);
      }),
      catchError((error) => {
        console.error('Error fetching security data:', error);
        return throwError(() => error);
      })
    );
  }

  updateSegment(segmentId: number, updatedSegment: Segment): Observable<Segment> {
    const url = `${this.apiUrl}/security/segments/${segmentId}`;
    return this.http.put<Segment>(url, updatedSegment, { headers: this.headers }).pipe(
      tap((updatedSegment) => {
        // Update the segment in the local security data
        const currentSecurityData = this.securityDataSubject.value;
        if (currentSecurityData && currentSecurityData.segments) {
          const segmentIndex = currentSecurityData.segments.findIndex((s) => s.id === segmentId);
          if (segmentIndex > -1) {
            currentSecurityData.segments[segmentIndex] = updatedSegment;
            this.securityDataSubject.next(currentSecurityData);
          }
        }
      }),
      catchError((error) => {
        console.error('Error updating segment:', error);
        return throwError(() => error);
      })
    );
  }

  createSegment(newSegment: Segment): Observable<Segment> {
    const url = `${this.apiUrl}/security/segments`;
    return this.http.post<Segment>(url, newSegment, { headers: this.headers }).pipe(
      tap((createdSegment) => {
        // Add the new segment to the local security data
        const currentSecurityData = this.securityDataSubject.value;
        if (currentSecurityData && currentSecurityData.segments) {
          currentSecurityData.segments.push(createdSegment);
          this.securityDataSubject.next(currentSecurityData);
        }
      }),
      catchError((error) => {
        console.error('Error creating segment:', error);
        return throwError(() => error);
      })
    );
  }

  deleteSegment(segmentId: number): Observable<any> {
    const url = `${this.apiUrl}/security/segments/${segmentId}`;
    return this.http.delete(url, { headers: this.headers }).pipe(
      tap(() => {
        // Remove the segment from the local security data
        const currentSecurityData = this.securityDataSubject.value;
        if (currentSecurityData && currentSecurityData.segments) {
          currentSecurityData.segments = currentSecurityData.segments.filter((s) => s.id !== segmentId);
          this.securityDataSubject.next(currentSecurityData);
        }
      }),
      catchError((error) => {
        console.error('Error deleting segment:', error);
        return throwError(() => error);
      })
    );
  }

  runScan(): Observable<any> {
    const url = `${this.apiUrl}/security/scan`;
    return this.http.post(url, null, { headers: this.headers }).pipe(
      tap((_res) => {
        this.getSecurityData().subscribe();
      }),
      catchError((_err) => {
        return throwError(() => _err);
      })
    );
  }

  stopScan(): Observable<any> {
    const url = `${this.apiUrl}/security/stop-scan`;
    return this.http.post(url, null, { headers: this.headers }).pipe(
      tap((_res) => {
        this.getSecurityData().subscribe();
      }),
      catchError((_err) => {
        return throwError(() => _err);
      })
    );
  }
}
