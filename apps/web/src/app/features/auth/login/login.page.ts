import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth/auth.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { HdriBackgroundComponent } from '../../../shared/components/hdri-background/hdri-background.component';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [
    NgOptimizedImage,
    RouterLink,
    ReactiveFormsModule,
    TranslateModule,
    HdriBackgroundComponent
],
  templateUrl: './login.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly analytics = inject(AnalyticsService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly isAuthenticated = this.auth.isAuthenticated;

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    // Si venimos redirigidos desde una ruta protegida, abrimos el formulario directo.
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.showForm.set(true);
    }
  }

  openForm(): void {
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.error.set(null);
  }

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

      // Track successful login
      this.analytics.trackEvent('login', {
        method: 'email',
        source: 'login_page',
      });

      // Get returnUrl from query params, default to /cars/list for better UX after login
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/cars/list';
      await this.router.navigateByUrl(returnUrl);
    } catch (err) {
      // Track failed login
      this.analytics.trackEvent('login', {
        method: 'email',
        source: 'login_page',
        error_message: err instanceof Error ? err.message : 'unknown',
      });

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

    // Track login attempt
    this.analytics.trackEvent('login', {
      method: 'google',
      source: 'login_page',
      step: 'initiated',
    });

    try {
      await this.auth.signInWithGoogle();
      // La redirección a Google ocurre automáticamente
      // El callback manejará el retorno y tracking de completion
    } catch (err) {
      // Track failed Google login
      this.analytics.trackEvent('login', {
        method: 'google',
        source: 'login_page',
        error_message: err instanceof Error ? err.message : 'unknown',
      });

      this.error.set(
        err instanceof Error ? err.message : 'No pudimos conectar con Google. Intentá nuevamente.',
      );
    } finally {
      // Timeout para permitir redirección antes de resetear loading
      // Si la redirección ocurre, este código no se ejecutará
      setTimeout(() => this.loading.set(false), 3000);
    }
  }

  async signInWithTikTok(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    // Track login attempt
    this.analytics.trackEvent('login', {
      method: 'tiktok',
      source: 'login_page',
      step: 'initiated',
    });

    try {
      await this.auth.signInWithTikTok();
      // La redirección a TikTok ocurre automáticamente
      // El callback manejará el retorno y tracking de completion
    } catch (err) {
      // Track failed TikTok login
      this.analytics.trackEvent('login', {
        method: 'tiktok',
        source: 'login_page',
        error_message: err instanceof Error ? err.message : 'unknown',
      });

      this.error.set(
        err instanceof Error ? err.message : 'No pudimos conectar con TikTok. Intentá nuevamente.',
      );
    } finally {
      // Timeout para permitir redirección antes de resetear loading
      setTimeout(() => this.loading.set(false), 3000);
    }
  }
}
