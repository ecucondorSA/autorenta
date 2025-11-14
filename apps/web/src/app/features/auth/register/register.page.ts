import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { TikTokEventsService } from '../../../core/services/tiktok-events.service';
import { environment } from '../../../../environments/environment';

@Component({
  standalone: true,
  selector: 'app-register-page',
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule],
  templateUrl: './register.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly tiktokEvents = inject(TikTokEventsService);

  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.message.set(null);

    try {
      const { email, password, fullName, phone } = this.form.getRawValue();
      await this.auth.signUp(email, password, fullName, phone);

      // 🎯 TikTok Events: Track CompleteRegistration
      void this.tiktokEvents.trackCompleteRegistration({
        value: 0,
        currency: environment.defaultCurrency
      });

      this.message.set('¡Cuenta creada exitosamente! Vamos a configurarte.');
      setTimeout(() => void this.router.navigate(['/onboarding']), 1500);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'No pudimos registrar el usuario.');
    } finally {
      this.loading.set(false);
    }
  }

  async signUpWithGoogle(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.message.set(null);

    try {
      await this.auth.signInWithGoogle();
      // La redirección a Google ocurre automáticamente
      // El callback manejará el retorno y creará el perfil si es necesario
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'No pudimos conectar con Google. Intentá nuevamente.',
      );
      this.loading.set(false);
    }
  }
}
