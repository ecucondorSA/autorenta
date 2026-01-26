import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../../../core/models/security.model';
import { Segment } from '../../../../../../core/models/segment.model';
import { Province } from '../../../../../../core/models/province.model';
import { City } from '../../../../../../core/models/city.model';
import { Review } from '../../../../../../core/models/review.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurities(): Observable<Security[]> {
    return this.http.get<Security[]>(`${this.apiUrl}/securities`).pipe(
      catchError((error) => {
        console.error('Error fetching securities:', error);
        return of([]);
      })
    );
  }

  getSecurity(id: string): Observable<Security> {
    return this.http.get<Security>(`${this.apiUrl}/securities/${id}`).pipe(
      catchError((error) => {
        console.error(`Error fetching security with id ${id}:`, error);
        return of(null as any);
      })
    );
  }

  createSecurity(security: Security): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/securities`, security).pipe(
      catchError((error) => {
        console.error('Error creating security:', error);
        return of(null as any);
      })
    );
  }

  updateSecurity(id: string, security: Security): Observable<Security> {
    return this.http.put<Security>(`${this.apiUrl}/securities/${id}`, security).pipe(
      catchError((error) => {
        console.error(`Error updating security with id ${id}:`, error);
        return of(null as any);
      })
    );
  }

  deleteSecurity(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/securities/${id}`).pipe(
      catchError((error) => {
        console.error(`Error deleting security with id ${id}:`, error);
        return of(null);
      })
    );
  }

  getSegments(): Observable<Segment[]> {
    return this.http.get<Segment[]>(`${this.apiUrl}/segments`).pipe(
      catchError((error) => {
        console.error('Error fetching segments:', error);
        return of([]);
      })
    );
  }

  getProvinces(): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.apiUrl}/provinces`).pipe(
      catchError((error) => {
        console.error('Error fetching provinces:', error);
        return of([]);
      })
    );
  }

  getCitiesByProvince(provinceId: string): Observable<City[]> {
    return this.http
      .get<City[]>(`${this.apiUrl}/provinces/${provinceId}/cities`)
      .pipe(
        catchError((error) => {
          console.error(
            `Error fetching cities for province with id ${provinceId}:`,
            error
          );
          return of([]);
        })
      );
  }

  uploadImage(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<unknown>(`${this.apiUrl}/images`, formData).pipe(
      map((res: unknown) => {
        return res;
      }),
      catchError((err: unknown) => {
        console.error(err);
        return of(null);
      })
    );
  }

  uploadVideo(file: File): Observable<unknown> {
    const formData = new FormData();
    formData.append('video', file);

    return this.http.post<unknown>(`${this.apiUrl}/videos`, formData).pipe(
      map((res: unknown) => {
        return res;
      }),
      catchError((err: unknown) => {
        console.error(err);
        return of(null);
      })
    );
  }
}
