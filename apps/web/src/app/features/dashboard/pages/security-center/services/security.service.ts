import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Review } from '../../../../../../core/models/review.model';
import { Segment } from '../../../../../../core/models/segment.model';
import { Security } from '../../../../../../core/models/security.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiURL = environment.apiURL;

  constructor(private http: HttpClient) {}

  getReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiURL}/reviews`);
  }

  getSegments(): Observable<Segment[]> {
    return this.http.get<Segment[]>(`${this.apiURL}/segments`);
  }

  getSecurities(): Observable<Security[]> {
    return this.http.get<Security[]>(`${this.apiURL}/securities`);
  }

  addReview(review: Review): Observable<Review> {
    return this.http.post<Review>(`${this.apiURL}/reviews`, review);
  }

  addSegment(segment: Segment): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiURL}/segments`, segment);
  }

  addSecurity(security: Security): Observable<Security> {
    return this.http.post<Security>(`${this.apiURL}/securities`, security);
  }

  updateReview(review: Review): Observable<Review> {
    return this.http.put<Review>(`${this.apiURL}/reviews/${review.id}`, review);
  }

  updateSegment(segment: Segment): Observable<Segment> {
    return this.http.put<Segment>(`${this.apiURL}/segments/${segment.id}`, segment);
  }

  updateSecurity(security: Security): Observable<Security> {
    return this.http.put<Security>(`${this.apiURL}/securities/${security.id}`, security);
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiURL}/reviews/${id}`);
  }

  deleteSegment(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiURL}/segments/${id}`);
  }

  deleteSecurity(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiURL}/securities/${id}`);
  }

  getReviewById(id: number): Observable<Review> {
    return this.http.get<Review>(`${this.apiURL}/reviews/${id}`);
  }

  getSegmentById(id: number): Observable<Segment> {
    return this.http.get<Segment>(`${this.apiURL}/segments/${id}`);
  }

  getSecurityById(id: number): Observable<Security> {
    return this.http.get<Security>(`${this.apiURL}/securities/${id}`);
  }

  // The following methods are for demonstration purposes and might not be needed in a real application.
  // They simulate success and error responses.
  testSuccessReview(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next({ status: 'success' });
        observer.complete();
      }, 1000);
    });
  }

  testErrorReview(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.error({ status: 'error', message: 'Simulated error' });
      }, 1000);
    });
  }

  testUpdateReview(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next({ status: 'updated' });
        observer.complete();
      }, 1000);
    });
  }

  testDeleteReview(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next({ status: 'deleted' });
        observer.complete();
      }, 1000);
    });
  }
}
