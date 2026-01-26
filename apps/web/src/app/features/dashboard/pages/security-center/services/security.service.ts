import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSecurityQuestions() {
    return this.http.get<any>(`${this.apiUrl}/security-questions`);
  }

  verifySecurityQuestions(userId: string, answers: { questionId: string; answer: string }[]) {
    return this.http.post<any>(`${this.apiUrl}/security-questions/verify`, {
      userId,
      answers,
    });
  }

  resetPassword(resetToken: string, newPasswordPlain: string) {
    return this.http.post<any>(`${this.apiUrl}/auth/reset-password`, {
      resetToken,
      newPasswordPlain,
    });
  }

  validateResetToken(resetToken: string) {
    return this.http.post<any>(`${this.apiUrl}/auth/validate-reset-token`, {
      resetToken,
    });
  }

  updateSecurityQuestions(userId: string, answers: { questionId: string; answer: string }[]) {
    return this.http.put<any>(`${this.apiUrl}/security-questions`, {
      userId,
      answers,
    });
  }

  initiatePasswordReset(email: string) {
    return this.http.post<any>(`${this.apiUrl}/auth/initiate-password-reset`, { email });
  }

  // Example of a get request
  getUsers() {
    return new Promise((resolve, reject) => {
      this.http.get<any>(`${this.apiUrl}/users`).subscribe(
        (res: any) => {
          resolve(res);
        },
        (err: any) => {
          reject(err);
        }
      );
    });
  }

  // Example of a post request
  createUser(user: any) {
    return new Promise((resolve, reject) => {
      this.http.post<any>(`${this.apiUrl}/users`, user).subscribe(
        (res: any) => {
          resolve(res);
        },
        (err: any) => {
          reject(err);
        }
      );
    });
  }

  // Example of a put request
  updateUser(user: any) {
    return new Promise((resolve, reject) => {
      this.http.put<any>(`${this.apiUrl}/users/${user.id}`, user).subscribe(
        (res: any) => {
          resolve(res);
        },
        (err: any) => {
          reject(err);
        }
      );
    });
  }

  // Example of a delete request
  deleteUser(id: string) {
    return new Promise((resolve, reject) => {
      this.http.delete<any>(`${this.apiUrl}/users/${id}`).subscribe(
        (res: any) => {
          resolve(res);
        },
        (err: any) => {
          reject(err);
        }
      );
    });
  }
}
