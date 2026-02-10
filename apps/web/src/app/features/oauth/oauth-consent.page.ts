import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to service facade
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

interface OAuthClientInfo {
  name: string;
  redirect_uri: string;
  scopes: string[];
}

interface AuthorizationDetails {
  client: OAuthClientInfo;
  redirect_uri: string;
  scopes: string[];
}

/**
 * OAuthConsentPage
 *
 * Pantalla de consentimiento OAuth para cuando Autorenta actúa como
 * proveedor de identidad para aplicaciones de terceros.
 *
 * Flujo:
 * 1. App tercera redirige a /oauth/consent?authorization_id=xxx
 * 2. Usuario ve qué app solicita acceso y qué permisos
 * 3. Usuario aprueba o deniega
 * 4. Se redirige de vuelta a la app tercera
 */
@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-oauth-consent-page',
  imports: [NgOptimizedImage],
  template: `
    <div class="min-h-screen bg-surface-base flex items-center justify-center py-12 px-4">
      <div class="w-full max-w-md">
        <!-- Loading State -->
        @if (loading()) {
          <div class="text-center space-y-6">
            <div class="h-16 flex items-center justify-center mb-4">
              <img
                ngSrc="/assets/images/autorentar-logo.png"
                alt="Autorentar"
                width="500"
                height="500"
                priority
                class="h-full w-auto object-contain scale-[2]"
              />
            </div>
            <div class="flex justify-center">
              <svg class="animate-spin h-12 w-12 text-cta-default" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <p class="text-text-secondary">Cargando información de autorización...</p>
          </div>
        }

        <!-- Error State -->
        @if (error()) {
          <div class="bg-error-bg border-2 border-error-border rounded-xl p-6 text-center">
            <div
              class="w-16 h-16 mx-auto mb-4 rounded-full bg-error-bg flex items-center justify-center"
            >
              <svg
                class="w-8 h-8 text-error-strong"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-error-strong mb-2">Error de autorización</h2>
            <p class="text-error-text mb-4">{{ error() }}</p>
            <button
              (click)="goHome()"
              class="px-6 py-3 rounded-lg bg-cta-default text-cta-text font-medium hover:opacity-90 transition-all"
            >
              Volver al inicio
            </button>
          </div>
        }

        <!-- Consent Screen -->
        @if (!loading() && !error() && authDetails()) {
          <div
            class="bg-surface-card border border-border-default rounded-xl shadow-lg overflow-hidden"
          >
            <!-- Header -->
            <div class="bg-surface-base p-6 border-b border-border-default text-center">
              <div class="h-12 flex items-center justify-center mb-4">
                <img
                  ngSrc="/assets/images/autorentar-logo.png"
                  alt="Autorentar"
                  width="500"
                  height="500"
                  priority
                  class="h-full w-auto object-contain scale-[1.5]"
                />
              </div>
              <h1 class="text-xl font-bold text-text-primary">Autorizar acceso</h1>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-6">
              <!-- App Info -->
              <div class="text-center">
                <div
                  class="w-16 h-16 mx-auto mb-3 rounded-full bg-cta-default/10 flex items-center justify-center"
                >
                  <svg
                    class="w-8 h-8 text-cta-default"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <p class="text-text-secondary">
                  <span class="font-semibold text-text-primary">{{
                    authDetails()?.client?.name || 'Una aplicación'
                  }}</span>
                  quiere acceder a tu cuenta de Autorentar
                </p>
              </div>

              <!-- Scopes -->
              @if (authDetails()?.scopes?.length) {
                <div class="bg-surface-base rounded-lg p-4">
                  <h3 class="text-sm font-medium text-text-secondary mb-3">
                    Esta aplicación podrá:
                  </h3>
                  <ul class="space-y-2">
                    @for (scope of authDetails()?.scopes; track scope) {
                      <li class="flex items-start gap-3">
                        <svg
                          class="w-5 h-5 text-success-strong flex-shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span class="text-sm text-text-primary">{{
                          getScopeDescription(scope)
                        }}</span>
                      </li>
                    }
                  </ul>
                </div>
              }

              <!-- Warning -->
              <div class="bg-warning-bg/50 border border-warning-border rounded-lg p-3">
                <p class="text-xs text-warning-text">
                  Al autorizar, esta aplicación podrá acceder a la información indicada. Podés
                  revocar el acceso en cualquier momento desde tu perfil.
                </p>
              </div>
            </div>

            <!-- Actions -->
            <div class="p-6 bg-surface-base border-t border-border-default space-y-3">
              <button
                (click)="approve()"
                [disabled]="processing()"
                class="w-full px-6 py-3 rounded-lg bg-cta-default text-cta-text font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                @if (processing()) {
                  <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Autorizando...
                } @else {
                  Autorizar
                }
              </button>
              <button
                (click)="deny()"
                [disabled]="processing()"
                class="w-full px-6 py-3 rounded-lg border border-border-default text-text-secondary font-medium hover:bg-surface-base transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>

          <!-- User Info -->
          <p class="text-center text-xs text-text-tertiary mt-4">
            Conectado como {{ currentUserEmail() }}
          </p>
        }
      </div>
    </div>
  `,
})
export class OAuthConsentPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly supabaseClient = inject(SupabaseClientService);
  private readonly auth = inject(AuthService);
  private readonly logger = inject(LoggerService);

  readonly loading = signal(true);
  readonly processing = signal(false);
  readonly error = signal<string | null>(null);
  readonly authDetails = signal<AuthorizationDetails | null>(null);
  readonly currentUserEmail = signal<string>('');

  private authorizationId: string | null = null;

  async ngOnInit(): Promise<void> {
    try {
      // Obtener authorization_id de query params
      this.authorizationId = this.route.snapshot.queryParamMap.get('authorization_id');

      if (!this.authorizationId) {
        throw new Error('No se proporcionó un ID de autorización válido.');
      }

      // Verificar si el usuario está autenticado
      if (!this.auth.isAuthenticated()) {
        // Redirigir a login preservando el authorization_id
        const returnUrl = `/oauth/consent?authorization_id=${this.authorizationId}`;
        await this.router.navigate(['/auth/login'], {
          queryParams: { returnUrl },
        });
        return;
      }

      // Obtener email del usuario actual
      const user = await this.auth.getCurrentUser();
      this.currentUserEmail.set(user?.email || 'usuario');

      // Obtener detalles de la autorización
      await this.loadAuthorizationDetails();
    } catch (err) {
      this.logger.error('Error en OAuth consent:', err);
      this.error.set(
        err instanceof Error ? err.message : 'Error al cargar la solicitud de autorización.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async loadAuthorizationDetails(): Promise<void> {
    if (!this.authorizationId) return;

    const client = this.supabaseClient.getClient();

    // Llamar al método de OAuth Server de Supabase
    const oauth = (
      client.auth as unknown as {
        oauth?: {
          getAuthorizationDetails?: (
            id: string,
          ) => Promise<{ data?: AuthorizationDetails; error?: { message?: string } }>;
        };
      }
    ).oauth;
    if (!oauth?.getAuthorizationDetails) {
      throw new Error('OAuth get authorization details not available');
    }
    const { data, error } = await oauth.getAuthorizationDetails(this.authorizationId);

    if (error) {
      throw new Error(error.message || 'No se pudo obtener la información de autorización.');
    }

    if (!data) {
      throw new Error('La solicitud de autorización no existe o expiró.');
    }

    this.authDetails.set(data as AuthorizationDetails);
  }

  getScopeDescription(scope: string): string {
    const scopeDescriptions: Record<string, string> = {
      openid: 'Verificar tu identidad',
      email: 'Ver tu dirección de email',
      profile: 'Ver tu información de perfil (nombre, foto)',
      'read:bookings': 'Ver tus reservas',
      'read:cars': 'Ver tus vehículos publicados',
      'read:wallet': 'Ver el saldo de tu billetera',
    };

    return scopeDescriptions[scope] || scope;
  }

  async approve(): Promise<void> {
    if (!this.authorizationId || this.processing()) return;

    this.processing.set(true);

    try {
      const client = this.supabaseClient.getClient();

      const oauth = (
        client.auth as unknown as {
          oauth?: {
            approveAuthorization?: (
              id: string,
            ) => Promise<{ data?: { redirect_to?: string }; error?: { message?: string } }>;
          };
        }
      ).oauth;
      if (!oauth?.approveAuthorization) {
        throw new Error('OAuth approve authorization not available');
      }
      const { data, error } = await oauth.approveAuthorization(this.authorizationId);

      if (error) {
        throw new Error(error.message || 'Error al aprobar la autorización.');
      }

      // Redirigir a la URL proporcionada por Supabase
      if (data?.redirect_to) {
        window.location.href = data.redirect_to;
      } else {
        throw new Error('No se recibió URL de redirección.');
      }
    } catch (err) {
      this.logger.error('Error aprobando OAuth:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al procesar la autorización.');
      this.processing.set(false);
    }
  }

  async deny(): Promise<void> {
    if (!this.authorizationId || this.processing()) return;

    this.processing.set(true);

    try {
      const client = this.supabaseClient.getClient();

      const oauth = (
        client.auth as unknown as {
          oauth?: {
            denyAuthorization?: (
              id: string,
            ) => Promise<{ data?: { redirect_to?: string }; error?: { message?: string } }>;
          };
        }
      ).oauth;
      if (!oauth?.denyAuthorization) {
        throw new Error('OAuth deny authorization not available');
      }
      const { data, error } = await oauth.denyAuthorization(this.authorizationId);

      if (error) {
        throw new Error(error.message || 'Error al denegar la autorización.');
      }

      // Redirigir a la URL proporcionada por Supabase
      if (data?.redirect_to) {
        window.location.href = data.redirect_to;
      } else {
        // Si no hay redirect_to, volver al inicio
        await this.router.navigate(['/']);
      }
    } catch (err) {
      this.logger.error('Error denegando OAuth:', err);
      // En caso de error al denegar, simplemente volver al inicio
      await this.router.navigate(['/']);
    }
  }

  async goHome(): Promise<void> {
    await this.router.navigate(['/']);
  }
}
