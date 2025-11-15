import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-reset-password-page',
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './reset-password.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPasswordPage {
  readonly email = signal('');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);

  constructor(private readonly auth: AuthService) {}

  async submit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.auth.resetPassword(this.email(), `${window.location.origin}/auth/update-password`);
      this.message.set('Te enviamos un correo para restablecer la contraseña.');
    } catch {
      this.message.set('No pudimos enviar el correo, intentá más tarde.');
    } finally {
      this.loading.set(false);
    }
  }
}
