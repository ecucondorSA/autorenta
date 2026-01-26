import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface SecurityQuestion {
  id: number;
  question: string;
}

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityQuestions(): Observable<ApiResponse<SecurityQuestion[]>> {
    return this.http.get<ApiResponse<SecurityQuestion[]>>(`${this.apiUrl}/security-questions`);
  }

  setUserSecurityQuestions(userId: string, question1Id: number, answer1: string, question2Id: number, answer2: string): Observable<ApiResponse<any>> {
    const payload = {
      userId,
      question1Id,
      answer1,
      question2Id,
      answer2,
    };
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/user-security-questions`, payload);
  }

  verifySecurityQuestions(userId: string, question1Id: number, answer1: string, question2Id: number, answer2: string): Observable<ApiResponse<boolean>> {
    const payload = {
      userId,
      question1Id,
      answer1,
      question2Id,
      answer2,
    };
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/verify-security-questions`, payload);
  }

  enable2FA(userId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/enable-2fa`, { userId });
  }

  disable2FA(userId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/disable-2fa`, { userId });
  }

  generateRecoveryCodes(userId: string): Observable<ApiResponse<string[]>> {
      return this.http.post<ApiResponse<string[]>>(`${this.apiUrl}/generate-recovery-codes`, { userId });
  }

  verifyRecoveryCode(userId: string, code: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/verify-recovery-code`, { userId, code });
  }

  invalidateRecoveryCodes(userId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/invalidate-recovery-codes`, { userId });
  }

  get2FAStatus(userId: string): Observable<ApiResponse<{ enabled: boolean }>> {
    return this.http.get<ApiResponse<{ enabled: boolean }>>(`${this.apiUrl}/2fa-status?userId=${userId}`);
  }

  getAuditLog(userId: string, page: number = 1, pageSize: number = 10): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/audit-log?userId=${userId}&page=${page}&pageSize=${pageSize}`);
  }
}
