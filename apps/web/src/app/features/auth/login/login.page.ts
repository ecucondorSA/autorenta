import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { BiometricAuthService } from '@core/services/auth/biometric-auth.service';
import { FacebookAuthService } from '@core/services/auth/facebook-auth.service';
import { GoogleOneTapService } from '@core/services/auth/google-one-tap.service';
import { PasskeysService } from '@core/services/auth/passkeys.service';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { TranslateModule } from '@ngx-translate/core';
import { HdriBackgroundComponent } from '../../../shared/components/hdri-background/hdri-background.component';
import { environment } from '@environment';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [RouterLink, ReactiveFormsModule, TranslateModule, HdriBackgroundComponent],
  templateUrl: './login.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full h-full',
  },
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class LoginPage implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly analytics = inject(AnalyticsService);
  private readonly googleOneTap = inject(GoogleOneTapService);
  private readonly facebookAuth = inject(FacebookAuthService);
  private readonly passkeys = inject(PasskeysService);
  private readonly biometric = inject(BiometricAuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly oneTapState = this.googleOneTap.state;
  readonly oneTapAvailable = this.googleOneTap.isAvailable;
  readonly passkeysSupported = this.passkeys.isSupported;
  readonly passkeysState = this.passkeys.state;
  readonly tiktokEnabled = environment.enableTikTok;
  readonly facebookEnabled = environment.enableFacebook;

  // Biometría nativa (huella/Face ID)
  readonly biometricReady = this.biometric.isReady;
  readonly biometricLoading = signal(false);
  readonly biometryLabel = signal('Huella digital');

  // Prompt para activar biometría después del login
  readonly showBiometricPrompt = signal(false);
  readonly biometricPromptLoading = signal(false);
  private pendingCredentials: { email: string; password: string } | null = null;
  private pendingReturnUrl: string = '/cars/list';

  constructor() {
    // Escuchar cuando One-Tap tenga éxito para trackear analytics
    effect(() => {
      if (this.oneTapState() === 'success') {
        this.analytics.trackEvent('login', {
          method: 'google_one_tap',
          source: 'login_page',
          step: 'completed',
        });
      }
    });
  }

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async ngOnInit(): Promise<void> {
    // Si venimos redirigidos desde una ruta protegida, abrimos el formulario directo.
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.showForm.set(true);
    }

    // Verificar disponibilidad de biometría nativa
    const biometricStatus = await this.biometric.checkAvailability();
    if (biometricStatus.available) {
      this.biometryLabel.set(this.biometric.getBiometryLabel());
    }

    // Inicializar Google One-Tap si está disponible
    if (this.oneTapAvailable && !this.isAuthenticated()) {
      const initialized = await this.googleOneTap.initialize();
      if (initialized) {
        // Mostrar el prompt de One-Tap automáticamente
        this.googleOneTap.showPrompt();
      }
    }
  }

  ngOnDestroy(): void {
    // Cancelar One-Tap si está mostrándose
    this.googleOneTap.cancel();
  }

  openForm(): void {
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.error.set(null);
  }

  async hapticFeedback(): Promise<void> {
    await Haptics.impact({ style: ImpactStyle.Light });
  }

  async hapticImpact(): Promise<void> {
    await Haptics.impact({ style: ImpactStyle.Medium });
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

      // Verificar si biometría está disponible y no tiene credenciales
      const biometricStatus = await this.biometric.checkAvailability();
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/cars/list';

      if (biometricStatus.available && !biometricStatus.hasCredentials) {
        // Mostrar prompt para activar biometría
        this.pendingCredentials = { email, password };
        this.pendingReturnUrl = returnUrl;
        this.showBiometricPrompt.set(true);
      } else {
        // Navegar directamente
        await this.router.navigateByUrl(returnUrl);
      }
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
    if (!this.tiktokEnabled) {
      this.error.set('TikTok está desactivado temporalmente.');
      return;
    }

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

  async signInWithFacebook(): Promise<void> {
    if (this.loading()) return;
    if (!this.facebookEnabled) {
      this.error.set('Facebook está desactivado temporalmente.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.analytics.trackEvent('login', {
      method: 'facebook',
      source: 'login_page',
      step: 'initiated',
    });

    try {
      await this.facebookAuth.login();

      this.analytics.trackEvent('login', {
        method: 'facebook',
        source: 'login_page',
        step: 'completed',
      });

      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/cars/list';
      await this.router.navigateByUrl(returnUrl);
    } catch (err) {
      this.analytics.trackEvent('login', {
        method: 'facebook',
        source: 'login_page',
        error_message: err instanceof Error ? err.message : 'unknown',
      });

      this.error.set(
        err instanceof Error
          ? err.message
          : 'No pudimos conectar con Facebook. Intentá nuevamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async signInWithPasskey(): Promise<void> {
    if (this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.analytics.trackEvent('login', {
      method: 'passkey',
      source: 'login_page',
      step: 'initiated',
    });

    try {
      const success = await this.passkeys.authenticate();

      if (success) {
        this.analytics.trackEvent('login', {
          method: 'passkey',
          source: 'login_page',
          step: 'completed',
        });

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/cars/list';
        await this.router.navigateByUrl(returnUrl);
      } else {
        this.error.set(this.passkeys.error() || 'No pudimos autenticar con passkey');
      }
    } catch (err) {
      this.analytics.trackEvent('login', {
        method: 'passkey',
        source: 'login_page',
        error_message: err instanceof Error ? err.message : 'unknown',
      });

      this.error.set(err instanceof Error ? err.message : 'Error al autenticar con passkey');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Aceptar activar biometría después del login
   */
  async acceptBiometricSetup(): Promise<void> {
    if (!this.pendingCredentials) {
      this.skipBiometricSetup();
      return;
    }

    this.biometricPromptLoading.set(true);

    try {
      // Verificar identidad con biometría primero
      const verified = await this.biometric.authenticate('Registra tu huella para acceso rápido');

      if (verified) {
        // Guardar credenciales
        const saved = await this.biometric.saveCredentials(
          this.pendingCredentials.email,
          this.pendingCredentials.password,
        );

        if (saved) {
          await Haptics.impact({ style: ImpactStyle.Heavy });
          this.analytics.trackEvent('biometric_setup', {
            action: 'activated',
            source: 'login_prompt',
          });
        }
      }
    } catch (err) {
      console.error('Error setting up biometric:', err);
    } finally {
      this.biometricPromptLoading.set(false);
      this.showBiometricPrompt.set(false);
      this.pendingCredentials = null;
      await this.router.navigateByUrl(this.pendingReturnUrl);
    }
  }

  /**
   * Omitir activación de biometría
   */
  async skipBiometricSetup(): Promise<void> {
    this.analytics.trackEvent('biometric_setup', {
      action: 'skipped',
      source: 'login_prompt',
    });

    this.showBiometricPrompt.set(false);
    this.pendingCredentials = null;
    await this.router.navigateByUrl(this.pendingReturnUrl);
  }

  /**
   * Login con biometría nativa (huella/Face ID) - Estilo banco
   */
  async signInWithBiometric(): Promise<void> {
    if (this.biometricLoading()) return;

    this.biometricLoading.set(true);
    this.error.set(null);

    // Haptic feedback al tocar
    await Haptics.impact({ style: ImpactStyle.Medium });

    this.analytics.trackEvent('login', {
      method: 'biometric_native',
      source: 'login_page',
      step: 'initiated',
    });

    try {
      const credentials = await this.biometric.loginWithBiometric();

      if (credentials) {
        // Login con las credenciales recuperadas
        await this.auth.signIn(credentials.email, credentials.password);

        // Haptic success
        await Haptics.impact({ style: ImpactStyle.Heavy });

        this.analytics.trackEvent('login', {
          method: 'biometric_native',
          source: 'login_page',
          step: 'completed',
        });

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/cars/list';
        await this.router.navigateByUrl(returnUrl);
      } else {
        this.error.set('No se pudo autenticar. Intentá con tu email y contraseña.');
        this.showForm.set(true);
      }
    } catch (err) {
      this.analytics.trackEvent('login', {
        method: 'biometric_native',
        source: 'login_page',
        error_message: err instanceof Error ? err.message : 'unknown',
      });

      this.error.set(err instanceof Error ? err.message : 'Error de autenticación biométrica');
      this.showForm.set(true);
    } finally {
      this.biometricLoading.set(false);
    }
  }
}
