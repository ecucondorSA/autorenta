import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../../core/models/security.model';
import { Province } from '../../../../../core/models/province.model';
import { City } from '../../../../../core/models/city.model';
import { Segment } from '../../../../../core/models/segment.model';
import { Review } from '../../../../../core/models/review.model';

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

  getProvinces(): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.apiUrl}/provinces`);
  }

  getProvince(id: string): Observable<Province> {
    return this.http.get<Province>(`${this.apiUrl}/provinces/${id}`);
  }

  createProvince(province: Province): Observable<Province> {
    return this.http.post<Province>(`${this.apiUrl}/provinces`, province);
  }

  updateProvince(id: string, province: Province): Observable<Province> {
    return this.http.put<Province>(`${this.apiUrl}/provinces/${id}`, province);
  }

  deleteProvince(id: string): Observable<Province> {
    return this.http.delete<Province>(`${this.apiUrl}/provinces/${id}`);
  }

  getCities(): Observable<City[]> {
    return this.http.get<City[]>(`${this.apiUrl}/cities`);
  }

  getCity(id: string): Observable<City> {
    return this.http.get<City>(`${this.apiUrl}/cities/${id}`);
  }

  createCity(city: City): Observable<City> {
    return this.http.post<City>(`${this.apiUrl}/cities`, city);
  }

  updateCity(id: string, city: City): Observable<City> {
    return this.http.put<City>(`${this.apiUrl}/cities/${id}`, city);
  }

  deleteCity(id: string): Observable<City> {
    return this.http.delete<City>(`${this.apiUrl}/cities/${id}`);
  }

  uploadFile(file: any): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload`, formData);
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

  getReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/reviews`);
  }

  getReview(id: string): Observable<Review> {
    return this.http.get<Review>(`${this.apiUrl}/reviews/${id}`);
  }

  createReview(review: Review): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/reviews`, review);
  }

  updateReview(id: string, review: Review): Observable<Review> {
    return this.http.put<Review>(`${this.apiUrl}/reviews/${id}`, review);
  }

  deleteReview(id: string): Observable<Review> {
    return this.http.delete<Review>(`${this.apiUrl}/reviews/${id}`);
  }

  testError(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.error(new Error('This is a test error'));
      }, 1000);
    });
  }

  testSuccess(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testBoth(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.error(new Error('This is a test error'));
        observer.complete();
      }, 1000);
    });
  }

  testComplete(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testTimeout(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 5000);
    });
  }

  testRetry(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testCatchError(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testFinalize(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testDelay(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testDebounceTime(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testDistinctUntilChanged(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testTake(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testTakeUntil(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testSkip(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testThrottleTime(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testAuditTime(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testSampleTime(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testMap(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testPluck(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testMapTo(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testScan(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testReduce(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testTap(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testStartWith(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testEndWith(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testMulticast(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testShare(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testShareReplay(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testConnect(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testPublish(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testPublishLast(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testPublishBehavior(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testPublishReplay(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testCombineLatest(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testConcat(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testForkJoin(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/forkjoin`);
  }

  testMerge(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testPartition(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testRace(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }

  testZip(): Observable<any> {
    return new Observable((observer) => {
      setTimeout(() => {
        observer.next('This is a test success');
        observer.complete();
      }, 1000);
    });
  }
}
