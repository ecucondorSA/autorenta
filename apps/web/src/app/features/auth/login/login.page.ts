import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [CommonModule, NgOptimizedImage, RouterLink, ReactiveFormsModule, TranslateModule],
  templateUrl: './login.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.signIn(email, password);

      // Get returnUrl from query params, default to /cars/list for better UX after login
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/cars/list';
      await this.router.navigateByUrl(returnUrl);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'No pudimos iniciar sesión, revisá tus credenciales.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.signInWithGoogle();
      // La redirección a Google ocurre automáticamente
      // El callback manejará el retorno
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'No pudimos conectar con Google. Intentá nuevamente.',
      );
      this.loading.set(false);
    }
  }

  async signInWithTikTok(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.auth.signInWithTikTok();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'No pudimos conectar con TikTok. Intentá nuevamente.',
      );
      this.loading.set(false);
    }
  }
}
