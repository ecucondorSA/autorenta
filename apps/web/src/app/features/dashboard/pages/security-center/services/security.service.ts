import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Security } from '../../../../core/models/security.model';
import { Segment } from '../../../../core/models/segment.model';
import { Province } from '../../../../core/models/province.model';
import { Review } from '../../../../core/models/review.model';
import { City } from '../../../../core/models/city.model';
import { District } from '../../../../core/models/district.model';
import { Neighborhood } from '../../../../core/models/neighborhood.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurity(): Observable<Security[]> {
    return this.http.get<Security[]>(`${this.apiUrl}/securities`);
  }

  getSecurityById(id: number): Observable<Security> {
    return this.http.get<Security>(`${this.apiUrl}/securities/${id}`);
  }

  createSecurity(security: Security): Observable<Security> {
    return this.http.post<Security>(`${this.apiUrl}/securities`, security);
  }

  updateSecurity(id: number, security: Security): Observable<Security> {
    return this.http.put<Security>(`${this.apiUrl}/securities/${id}`, security);
  }

  deleteSecurity(id: number): Observable<Security> {
    return this.http.delete<Security>(`${this.apiUrl}/securities/${id}`);
  }

  //SEGMENTS
  getSegments(): Observable<Segment[]> {
    return this.http.get<Segment[]>(`${this.apiUrl}/segments`);
  }

  getSegmentById(id: number): Observable<Segment> {
    return this.http.get<Segment>(`${this.apiUrl}/segments/${id}`);
  }

  createSegment(segment: Segment): Observable<Segment> {
    return this.http.post<Segment>(`${this.apiUrl}/segments`, segment);
  }

  updateSegment(id: number, segment: Segment): Observable<Segment> {
    return this.http.put<Segment>(`${this.apiUrl}/segments/${id}`, segment);
  }

  deleteSegment(id: number): Observable<Segment> {
    return this.http.delete<Segment>(`${this.apiUrl}/segments/${id}`);
  }

  //PROVINCES
  getProvinces(): Observable<Province[]> {
    return this.http.get<Province[]>(`${this.apiUrl}/provinces`);
  }

  getProvinceById(id: number): Observable<Province> {
    return this.http.get<Province>(`${this.apiUrl}/provinces/${id}`);
  }

  //REVIEWS
  getReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/reviews`);
  }

  getReviewById(id: number): Observable<Review> {
    return this.http.get<Review>(`${this.apiUrl}/reviews/${id}`);
  }

  //CITIES
  getCities(): Observable<City[]> {
    return this.http.get<City[]>(`${this.apiUrl}/cities`);
  }

  getCityById(id: number): Observable<City> {
    return this.http.get<City>(`${this.apiUrl}/cities/${id}`);
  }

  //DISTRICTS
  getDistricts(): Observable<District[]> {
    return this.http.get<District[]>(`${this.apiUrl}/districts`);
  }

  getDistrictById(id: number): Observable<District> {
    return this.http.get<District>(`${this.apiUrl}/districts/${id}`);
  }

  //NEIGHBORHOODS
  getNeighborhoods(): Observable<Neighborhood[]> {
    return this.http.get<Neighborhood[]>(`${this.apiUrl}/neighborhoods`);
  }

  getNeighborhoodById(id: number): Observable<Neighborhood> {
    return this.http.get<Neighborhood>(`${this.apiUrl}/neighborhoods/${id}`);
  }

  uploadFile(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  bulkCreate(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    const headers = new HttpHeaders();
    headers.append('Content-Type', 'multipart/form-data');

    return this.http.post(`${this.apiUrl}/bulk-create`, formData, { headers });
  }

  getFiles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/files`);
  }

  processFile(fileName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/process-file`, { fileName });
  }

  downloadFile(fileName: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/download/${fileName}`, { responseType: 'blob' });
  }

  getLogs(): Observable<any> {
    return this.http.get(`${this.apiUrl}/logs`);
  }

  retryProcess(fileName: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/retry-process`, { fileName });
  }

  clearData(): Observable<any> {
    return this.http.post(`${this.apiUrl}/clear-data`, {});
  }

  getSecurityByFilters(
    page: number,
    limit: number,
    sort: string,
    order: string,
    province?: string,
    city?: string,
    district?: string,
    neighborhood?: string,
    segment?: string,
    minPrice?: number,
    maxPrice?: number,
    minYear?: number,
    maxYear?: number,
    isNew?: boolean,
    hasFinancing?: boolean,
    keywords?: string
  ): Observable<any> {
    let url = `${this.apiUrl}/securities/filter?page=${page}&limit=${limit}&sort=${sort}&order=${order}`;

    if (province) {
      url += `&province=${province}`;
    }
    if (city) {
      url += `&city=${city}`;
    }
    if (district) {
      url += `&district=${district}`;
    }
    if (neighborhood) {
      url += `&neighborhood=${neighborhood}`;
    }
    if (segment) {
      url += `&segment=${segment}`;
    }
    if (minPrice) {
      url += `&minPrice=${minPrice}`;
    }
    if (maxPrice) {
      url += `&maxPrice=${maxPrice}`;
    }
    if (minYear) {
      url += `&minYear=${minYear}`;
    }
    if (maxYear) {
      url += `&maxYear=${maxYear}`;
    }
    if (isNew !== undefined) {
      url += `&isNew=${isNew}`;
    }
    if (hasFinancing !== undefined) {
      url += `&hasFinancing=${hasFinancing}`;
    }
    if (keywords) {
      url += `&keywords=${keywords}`;
    }

    return this.http.get(url);
  }

  getMapData(
    province?: string,
    city?: string,
    district?: string,
    neighborhood?: string,
    segment?: string,
    minPrice?: number,
    maxPrice?: number,
    minYear?: number,
    maxYear?: number,
    isNew?: boolean,
    hasFinancing?: boolean,
    keywords?: string
  ): Observable<any> {
    let url = `${this.apiUrl}/securities/map-data?`;

    if (province) {
      url += `province=${province}&`;
    }
    if (city) {
      url += `city=${city}&`;
    }
    if (district) {
      url += `district=${district}&`;
    }
    if (neighborhood) {
      url += `neighborhood=${neighborhood}&`;
    }
    if (segment) {
      url += `segment=${segment}&`;
    }
    if (minPrice) {
      url += `minPrice=${minPrice}&`;
    }
    if (maxPrice) {
      url += `maxPrice=${maxPrice}&`;
    }
    if (minYear) {
      url += `minYear=${minYear}&`;
    }
    if (maxYear) {
      url += `maxYear=${maxYear}&`;
    }
    if (isNew !== undefined) {
      url += `isNew=${isNew}&`;
    }
    if (hasFinancing !== undefined) {
      url += `hasFinancing=${hasFinancing}&`;
    }
    if (keywords) {
      url += `keywords=${keywords}&`;
    }

    return this.http.get(url);
  }

  getStats(
    province?: string,
    city?: string,
    district?: string,
    neighborhood?: string,
    segment?: string,
    minPrice?: number,
    maxPrice?: number,
    minYear?: number,
    maxYear?: number,
    isNew?: boolean,
    hasFinancing?: boolean,
    keywords?: string
  ): Observable<any> {
    let url = `${this.apiUrl}/securities/stats?`;

    if (province) {
      url += `province=${province}&`;
    }
    if (city) {
      url += `city=${city}&`;
    }
    if (district) {
      url += `district=${district}&`;
    }
    if (neighborhood) {
      url += `neighborhood=${neighborhood}&`;
    }
    if (segment) {
      url += `segment=${segment}&`;
    }
    if (minPrice) {
      url += `minPrice=${minPrice}&`;
    }
    if (maxPrice) {
      url += `maxPrice=${maxPrice}&`;
    }
    if (minYear) {
      url += `minYear=${minYear}&`;
    }
    if (maxYear) {
      url += `maxYear=${maxYear}&`;
    }
    if (isNew !== undefined) {
      url += `isNew=${isNew}&`;
    }
    if (hasFinancing !== undefined) {
      url += `hasFinancing=${hasFinancing}&`;
    }
    if (keywords) {
      url += `keywords=${keywords}&`;
    }

    return this.http.get(url);
  }

  getFilters(): Observable<any> {
    return this.http.get(`${this.apiUrl}/filters`);
  }

  getFilterValues(
    province?: string,
    city?: string,
    district?: string,
    neighborhood?: string,
    segment?: string
  ): Observable<any> {
    let url = `${this.apiUrl}/filter-values?`;

    if (province) {
      url += `province=${province}&`;
    }
    if (city) {
      url += `city=${city}&`;
    }
    if (district) {
      url += `district=${district}&`;
    }
    if (neighborhood) {
      url += `neighborhood=${neighborhood}&`;
    }
    if (segment) {
      url += `segment=${segment}&`;
    }

    return this.http.get(url);
  }

  getSimilarSecurities(securityId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/securities/${securityId}/similar`);
  }

  getSecurityAnalytics(securityId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/securities/${securityId}/analytics`);
  }

  createSecurityAnalytics(securityId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/securities/${securityId}/analytics`, {});
  }

  updateSecurityAnalytics(securityId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/securities/${securityId}/analytics`, data);
  }

  deleteSecurityAnalytics(securityId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/securities/${securityId}/analytics`);
  }

  getSecurityAnalyticsById(securityId: number, analyticsId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/securities/${securityId}/analytics/${analyticsId}`);
  }
}
