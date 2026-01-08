import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '@core/services/auth/auth.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { TikTokEventsService } from '@core/services/infrastructure/tiktok-events.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { environment } from '@environment';

@Component({
  standalone: true,
  selector: 'app-register-page',
  imports: [NgOptimizedImage, RouterLink, ReactiveFormsModule, TranslateModule],
  templateUrl: './register.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly tiktokEvents = inject(TikTokEventsService);
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  // Flexible phone pattern: allows spaces, dashes, parentheses
  private readonly flexiblePhonePattern = /^[\d\s\-().+]{7,20}$/;

  // Registro mínimo: solo email+password obligatorios, teléfono opcional
  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phone: ['', [Validators.pattern(this.flexiblePhonePattern)]], // OPCIONAL
  });

  // Magic Link mode
  readonly magicLinkMode = signal(false);
  readonly magicLinkSent = signal(false);

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

      // Track successful registration
      this.analytics.trackEvent('sign_up', {
        method: 'email',
        source: 'register_page',
      });

      // 🎯 TikTok Events: Track CompleteRegistration
      void this.tiktokEvents.trackCompleteRegistration({
        value: 0,
        currency: environment.defaultCurrency,
      });

      this.message.set('¡Cuenta creada! Ya podés explorar autos.');
      // Redirigir directo a explorar (sin onboarding obligatorio)
      setTimeout(() => void this.router.navigate(['/explore']), 1500);
    } catch (err) {
      // Track failed registration
      this.analytics.trackEvent('sign_up', {
        method: 'email',
        source: 'register_page',
        error_message: err instanceof Error ? err.message : 'unknown',
      });

      this.error.set(err instanceof Error ? err.message : 'No pudimos registrar el usuario.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Magic Link: registro sin contraseña
   * El usuario recibe un email con link para entrar directamente
   */
  async sendMagicLink(): Promise<void> {
    const email = this.form.controls.email.value;
    if (!email || this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const redirectTo = this.isBrowser ? `${window.location.origin}/explore` : undefined;
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: this.form.controls.fullName.value || email.split('@')[0],
          },
        },
      });

      if (error) throw error;

      this.analytics.trackEvent('sign_up', {
        method: 'magic_link',
        source: 'register_page',
      });

      this.magicLinkSent.set(true);
      this.message.set('¡Revisá tu email! Te enviamos un link para entrar.');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al enviar magic link');
    } finally {
      this.loading.set(false);
    }
  }

  toggleMagicLinkMode(): void {
    this.magicLinkMode.update((v) => !v);
    this.error.set(null);
    this.message.set(null);
    this.magicLinkSent.set(false);
  }

  async signUpWithGoogle(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.message.set(null);

    // Track sign up attempt
    this.analytics.trackEvent('sign_up', {
      method: 'google',
      source: 'register_page',
      step: 'initiated',
    });

    try {
      await this.auth.signInWithGoogle();
      // La redirección a Google ocurre automáticamente
      // El callback manejará el retorno y creará el perfil si es necesario
    } catch (err) {
      // Track failed Google sign up
      this.analytics.trackEvent('sign_up', {
        method: 'google',
        source: 'register_page',
        error_message: err instanceof Error ? err.message : 'unknown',
      });

      this.error.set(
        err instanceof Error ? err.message : 'No pudimos conectar con Google. Intentá nuevamente.',
      );
    } finally {
      // Timeout para permitir redirección antes de resetear loading
      setTimeout(() => this.loading.set(false), 3000);
    }
  }
}
