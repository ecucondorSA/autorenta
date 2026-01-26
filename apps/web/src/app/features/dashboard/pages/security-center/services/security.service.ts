import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { Security } from '../../../../core/models/security.model';
import { Review } from '../../../../core/models/review.model';
import { Province } from '../../../../core/models/province.model';
import { Segment } from '../../../../core/models/segment.model';
import { City } from '../../../../core/models/city.model';
import { Country } from '../../../../core/models/country.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurity(): Observable<Security[]> {
    return this.http.get<Security[]>(`${this.apiUrl}/security`);
  }

  getReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/reviews`);
  }

  getProvinces(): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.apiUrl}/provinces`);
  }

  getSegments(): Observable<Segment[]> {
    return this.http.get<Segment[]>(`${this.apiUrl}/segments`);
  }

  getCities(): Observable<City[]> {
    return this.http.get<City[]>(`${this.apiUrl}/cities`);
  }

  getCountries(): Observable<Country[]> {
    return this.http.get<Country[]>(`${this.apiUrl}/countries`);
  }

  createSecurity(security: Security): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/security`, security);
  }

  updateSecurity(security: Security): Observable<Security> {
    return this.http.put<Security>(`${this.apiUrl}/security/${security.id}`, security);
  }

  deleteSecurity(id: number): Observable<Security> {
    return this.http.delete<Security>(`${this.apiUrl}/security/${id}`);
  }

  createReview(review: Review): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/reviews`, review);
  }

  updateReview(review: Review): Observable<Review> {
    return this.http.put<Review>(`${this.apiUrl}/reviews/${review.id}`, review);
  }

  deleteReview(id: number): Observable<Review> {
    return this.http.delete<Review>(`${this.apiUrl}/reviews/${id}`);
  }

  uploadImage(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<unknown>(`${this.apiUrl}/upload`, formData);
  }

  getHello(): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/hello`);
  }

  testError(): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/test-error`);
  }

  testPost(): Observable<unknown> {
    return this.http.post<unknown>(`${this.apiUrl}/test-post`, {});
  }

  testPut(): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/test-put`, {});
  }

  testDelete(): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/test-delete`);
  }

  testPatch(): Observable<unknown> {
    return this.http.patch<unknown>(`${this.apiUrl}/test-patch`, {});
  }

  testError2(): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/test-error2`);
  }

  testError3(): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/test-error3`);
  }

  testTimeout(): Observable<unknown> {
    return this.http.get<unknown>(`${this.apiUrl}/test-timeout`);
  }

  testErrorPost(): Observable<unknown> {
    return this.http
      .post<unknown>(`${this.apiUrl}/test-error-post`, {})
      .subscribe(
        () => {},
        (_err) => {}
      );
  }

  testErrorPut(): Observable<unknown> {
    return this.http
      .put<unknown>(`${this.apiUrl}/test-error-put`, {})
      .subscribe(
        () => {},
        (_err) => {}
      );
  }

  testErrorDelete(): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiUrl}/test-error-delete`).subscribe(
      () => {},
      (_err) => {}
    );
  }

  testErrorPatch(): Observable<unknown> {
    return this.http
      .patch<unknown>(`${this.apiUrl}/test-error-patch`, {})
      .subscribe(
        () => {},
        (_err) => {}
      );
  }
}
