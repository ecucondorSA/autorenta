import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../core/models/security.model';
import { Segment } from '../../../../core/models/segment.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurities(): Observable<Security[]> {
    return this.http.get<Security[]>(`${this.apiUrl}/securities`).pipe(
      catchError(this.handleError<Security[]>('getSecurities', [])),
      map((data: any) => {
        return data.map((item: any) => {
          return {
            id: item.id,
            name: item.name,
            description: item.description,
            riskLevel: item.riskLevel,
            affectedSegment: item.affectedSegment,
          };
        });
      })
    );
  }

  getSecurity(id: number): Observable<Security> {
    return this.http.get<Security>(`${this.apiUrl}/securities/${id}`).pipe(
      catchError(this.handleError<Security>('getSecurity'))
    );
  }

  addSecurity(security: Security): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/securities`, security).pipe(
      catchError(this.handleError<Security>('addSecurity'))
    );
  }

  updateSecurity(id: number, security: Security): Observable<any> {
    return this.http.put(`${this.apiUrl}/securities/${id}`, security).pipe(
      catchError(this.handleError<any>('updateSecurity'))
    );
  }

  deleteSecurity(id: number): Observable<Security> {
    return this.http.delete<Security>(`${this.apiUrl}/securities/${id}`).pipe(
      catchError(this.handleError<Security>('deleteSecurity'))
    );
  }

  getSegments(): Observable<Segment[]> {
    return this.http.get<Segment[]>(`${this.apiUrl}/segments`).pipe(
      catchError(this.handleError<Segment[]>('getSegments', [])),
      map((data: any) => {
        return data.map((item: any) => {
          return {
            id: item.id,
            name: item.name,
          };
        });
      })
    );
  }

  getSegment(id: number): Observable<Segment> {
    return this.http.get<Segment>(`${this.apiUrl}/segments/${id}`).pipe(
      catchError(this.handleError<Segment>('getSegment'))
    );
  }

  addSegment(segment: Segment): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiUrl}/segments`, segment).pipe(
      catchError(this.handleError<Segment>('addSegment'))
    );
  }

  updateSegment(id: number, segment: Segment): Observable<any> {
    return this.http.put(`${this.apiUrl}/segments/${id}`, segment).pipe(
      catchError(this.handleError<any>('updateSegment'))
    );
  }

  deleteSegment(id: number): Observable<Segment> {
    return this.http.delete<Segment>(`${this.apiUrl}/segments/${id}`).pipe(
      catchError(this.handleError<Segment>('deleteSegment'))
    );
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(error); // log to console instead
      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  // Example methods with callbacks (to be removed or refactored)
  exampleGetSecurities(callback: (securities: Security[]) => void) {
    this.http.get<Security[]>(`${this.apiUrl}/securities`).subscribe({
      next: (res: any) => {
        const securities: Security[] = res.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          riskLevel: item.riskLevel,
          affectedSegment: item.affectedSegment,
        }));
        callback(securities);
      },
      error: (err: any) => {
        console.error(err);
      },
    });
  }

  exampleGetSegments(callback: (segments: Segment[]) => void) {
    this.http.get<Segment[]>(`${this.apiUrl}/segments`).subscribe({
      next: (res: any) => {
        const segments: Segment[] = res.map((item: any) => ({
          id: item.id,
          name: item.name,
        }));
        callback(segments);
      },
      error: (err: any) => {
        console.error(err);
      },
    });
  }
}
