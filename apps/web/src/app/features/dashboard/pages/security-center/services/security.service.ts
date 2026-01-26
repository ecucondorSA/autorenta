import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Segment } from '../../../../../../core/models/segment.model';
import { Security } from '../../../../../../core/models/security.model';

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

  createSegment(segment: Segment): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiUrl}/segments`, segment);
  }

  updateSegment(id: string, segment: Segment): Observable<Segment> {
    return this.http.put<Segment>(`${this.apiUrl}/segments/${id}`, segment);
  }

  deleteSegment(id: string): Observable<Segment> {
    return this.http.delete<Segment>(`${this.apiUrl}/segments/${id}`);
  }

  getSecurityForSegment(segmentId: string): Observable<Security[]> {
    return this.http.get<Security[]>(`${this.apiUrl}/segments/${segmentId}/securities`);
  }

  addSecurityToSegment(segmentId: string, securityId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/segments/${segmentId}/securities/${securityId}`, {});
  }

  removeSecurityFromSegment(segmentId: string, securityId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/segments/${segmentId}/securities/${securityId}`);
  }

  generateRandomString(length: number) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }

  bulkCreateSecurities(amount: number): Observable<any> {
    return new Observable((observer) => {
      for (let i = 0; i < amount; i++) {
        const security: Security = {
          id: this.generateRandomString(20),
          name: this.generateRandomString(10),
          description: this.generateRandomString(50),
          segment: null,
        };

        this.createSecurity(security).subscribe(
          (res) => {
            console.log('Security created');
          },
          (err) => {
            console.error('Error creating security');
          }
        );
      }
      observer.next('Completed');
      observer.complete();
    });
  }

  bulkCreateSegments(amount: number): Observable<any> {
    return new Observable((observer) => {
      for (let i = 0; i < amount; i++) {
        const segment: Segment = {
          id: this.generateRandomString(20),
          name: this.generateRandomString(10),
          description: this.generateRandomString(50),
          securities: [],
        };

        this.createSegment(segment).subscribe(
          (res) => {
            console.log('Segment created');
          },
          (err) => {
            console.error('Error creating segment');
          }
        );
      }
      observer.next('Completed');
      observer.complete();
    });
  }
}
