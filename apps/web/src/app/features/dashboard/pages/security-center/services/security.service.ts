import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../../core/models/security.model';
import { Review } from '../../../../../core/models/review.model';
import { Segment } from '../../../../../core/models/segment.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private securityDataSubject = new BehaviorSubject<Security | null>(null);
  securityData$ = this.securityDataSubject.asObservable();
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<Security> {
    return this.http.get<Security>(`${this.apiUrl}/security`).pipe(
      tap((data) => {
        this.securityDataSubject.next(data);
      })
    );
  }

  getReviewList(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/security/reviews`);
  }

  getSegments(): Observable<Segment[]> {
    return this.http.get<Segment[]>(`${this.apiUrl}/security/segments`);
  }

  addReview(review: Review): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/security/reviews`, review);
  }

  updateReview(review: Review): Observable<Review> {
    return this.http.put<Review>(`${this.apiUrl}/security/reviews/${review.id}`, review);
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/security/reviews/${id}`);
  }

  addSegment(segment: Segment): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiUrl}/security/segments`, segment);
  }

  updateSegment(segment: Segment): Observable<Segment> {
    return this.http.put<Segment>(`${this.apiUrl}/security/segments/${segment.id}`, segment);
  }

  deleteSegment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/security/segments/${id}`);
  }

  uploadImage(imageFile: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('image', imageFile);

    return this.http.post(`${this.apiUrl}/upload`, formData).pipe(
      map((response: unknown) => {
        return response;
      })
    );
  }

  getUploadedImages(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/images`);
  }

  deleteImage(imageUrl: string): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/images?imageUrl=${imageUrl}`).pipe(
      map((response: unknown) => {
        return response;
      })
    );
  }

  runSecurityCheck(): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/security/run-check`, {}).pipe(
      map((response: unknown) => {
        return response;
      })
    );
  }

  getSecurityCheckStatus(): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/security/check-status`).pipe(
      map((response: unknown) => {
        return response;
      })
    );
  }

  approveSecurityCheck(): Observable<unknown> {
    return this.http
      .post(`${this.apiUrl}/security/approve`, {})
      .pipe(
        tap(() => {
          this.getSecurityData().subscribe({
            next: (_res) => {
              this.getSecurityData();
            },
            error: (_err) => {
              console.error('Error during getSecurityData after approval');
            },
          });
        }),
        map((response: unknown) => {
          return response;
        })
      );
  }

  rejectSecurityCheck(): Observable<unknown> {
    return this.http
      .post(`${this.apiUrl}/security/reject`, {})
      .pipe(
        tap(() => {
          this.getSecurityData().subscribe({
            next: (_res) => {
              this.getSecurityData();
            },
            error: (_err) => {
              console.error('Error during getSecurityData after rejection');
            },
          });
        }),
        map((response: unknown) => {
          return response;
        })
      );
  }
}
