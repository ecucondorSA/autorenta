import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { CarService } from '@core/services/car.service';
import { ToastService } from '@core/services/toast.service';
import { PhotoService } from '@core/services/photo.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { SecurityCheck } from '../interfaces/security.interface';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;
  private securityChecksSubject = new BehaviorSubject<SecurityCheck[]>([]);
  securityChecks$ = this.securityChecksSubject.asObservable();

  constructor(private http: HttpClient) {}

  getSecurityChecks() {
    return this.http
      .get<SecurityCheck[]>(`${this.apiUrl}/security-checks`)
      .subscribe((checks) => {
        this.securityChecksSubject.next(checks);
      });
  }

  addSecurityCheck(securityCheck: SecurityCheck) {
    return this.http
      .post<SecurityCheck>(`${this.apiUrl}/security-checks`, securityCheck)
      .subscribe(() => {
        this.getSecurityChecks();
      });
  }

  updateSecurityCheck(securityCheck: SecurityCheck) {
    return this.http
      .put<SecurityCheck>(
        `${this.apiUrl}/security-checks/${securityCheck.id}`,
        securityCheck
      )
      .subscribe(() => {
        this.getSecurityChecks();
      });
  }

  deleteSecurityCheck(id: number) {
    return this.http
      .delete(`${this.apiUrl}/security-checks/${id}`)
      .subscribe(() => {
        this.getSecurityChecks();
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async uploadImage(file: any): Promise<any> {
    const formData = new FormData();
    formData.append('image', file);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await this.http.post<any>(`${this.apiUrl}/upload`, formData).toPromise();
  }
}
