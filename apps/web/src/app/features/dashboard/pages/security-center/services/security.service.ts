import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityQuestions(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/security/questions`);
  }

  verifySecurityQuestions(payload: { questionId: string; answer: string }[]): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/security/verify-questions`, payload);
  }

  enable2FA(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/2fa/enable`, {});
  }

  disable2FA(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/2fa/disable`, {});
  }

  generateRecoveryCodes(): Observable<ApiResponse<string[]>> {
    return this.http.post<ApiResponse<string[]>>(`${this.apiUrl}/auth/2fa/generate-recovery-codes`, {});
  }

  verifyRecoveryCode(code: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/2fa/verify-recovery-code`, { code });
  }

  get2FASettings(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/auth/2fa/settings`);
  }

  backupCodes(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/auth/2fa/backup-codes`);
  }

  // Password reset
  requestPasswordReset(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/password/reset/request`, { email });
  }

  verifyPasswordResetToken(token: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/password/reset/verify-token`, { token });
  }

  resetPassword(payload: { token: string; newPassword: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/password/reset`, payload);
  }

  // Change password
  changePassword(payload: { currentPassword: string; newPassword: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/password/change`, payload);
  }

  // Email verification
  requestEmailVerification(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/email/verification/request`, {});
  }

  verifyEmail(token: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/email/verification/verify`, { token });
  }

  // Account deletion
  requestAccountDeletion(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/account/deletion/request`, {});
  }

  verifyAccountDeletion(token: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/account/deletion/verify`, { token });
  }

  // Account recovery
  recoverAccount(email: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/account/recovery/request`, { email });
  }

  verifyAccountRecovery(token: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/account/recovery/verify`, { token });
  }

  // Social login
  socialLogin(provider: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/auth/social/${provider}`);
  }

  // Logout
  logout(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/logout`, {});
  }

  // Refresh token
  refreshToken(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/auth/refresh`, {});
  }

  // User profile
  getProfile(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/user/profile`);
  }

  updateProfile(payload: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/user/profile`, payload);
  }

  // User settings
  getSettings(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/user/settings`);
  }

  updateSettings(payload: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/user/settings`, payload);
  }

  // Notifications
  getNotifications(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/user/notifications`);
  }

  markNotificationAsRead(notificationId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/user/notifications/${notificationId}/read`, {});
  }

  // Payments
  getPaymentMethods(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/user/payments/methods`);
  }

  addPaymentMethod(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/user/payments/methods`, payload);
  }

  deletePaymentMethod(paymentMethodId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/user/payments/methods/${paymentMethodId}`);
  }

  // Bookings
  getBookings(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/user/bookings`);
  }

  cancelBooking(bookingId: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/user/bookings/${bookingId}`);
  }

  // Support
  createSupportTicket(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/support/tickets`, payload);
  }

  getSupportTickets(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/support/tickets`);
  }

  // Admin
  getAdminDashboard(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/admin/dashboard`);
  }

  // Example of using generics
  getSomething<T>(): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(`${this.apiUrl}/something`);
  }
}
