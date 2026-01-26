import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SegmentModel } from '../../../../../core/models/segment.model';
import { SecurityModel } from '../../../../../core/models/security.model';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityData(): Observable<SecurityModel[]> {
    return this.http.get<SecurityModel[]>(`${this.apiUrl}/security`);
  }

  getSegmentData(): Observable<SegmentModel[]> {
    return this.http.get<SegmentModel[]>(`${this.apiUrl}/segment`);
  }

  addSecurity(securityData: SecurityModel): Observable<SecurityModel> {
    return this.http.post<SecurityModel>(`${this.apiUrl}/security`, securityData);
  }

  updateSecurity(id: string, securityData: SecurityModel): Observable<SecurityModel> {
    return this.http.put<SecurityModel>(`${this.apiUrl}/security/${id}`, securityData);
  }

  deleteSecurity(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/security/${id}`);
  }

  getSecurityById(id: string): Observable<SecurityModel> {
    return this.http.get<SecurityModel>(`${this.apiUrl}/security/${id}`);
  }

  // segment

  addSegment(segmentData: SegmentModel): Observable<SegmentModel> {
    return this.http.post<SegmentModel>(`${this.apiUrl}/segment`, segmentData);
  }

  updateSegment(id: string, segmentData: SegmentModel): Observable<SegmentModel> {
    return this.http.put<SegmentModel>(`${this.apiUrl}/segment/${id}`, segmentData);
  }

  deleteSegment(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/segment/${id}`);
  }

  getSegmentById(id: string): Observable<SegmentModel> {
    return this.http.get<SegmentModel>(`${this.apiUrl}/segment/${id}`);
  }

  // MOCKED
  mockedAddSecurity(req: any, res: any, err: any) {
    console.log('addSecurity', req, res, err);
    try {
      req.respondWith({
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Security added successfully',
        }),
      });
    } catch (error) {
      console.error('Error in mockedAddSecurity:', error);
    }
  }

  mockedUpdateSecurity(req: any, res: any, err: any) {
    console.log('updateSecurity', req, res, err);
    try {
      req.respondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Security updated successfully',
        }),
      });
    } catch (error) {
      console.error('Error in mockedUpdateSecurity:', error);
    }
  }
}
