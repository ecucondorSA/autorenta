import {Component, OnInit, signal, inject,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MercadoPagoOAuthService } from '../../core/services/mercadopago-oauth.service';

@Component({
  selector: 'app-mercadopago-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      @if (processing()) {
        <div class="callback-state processing">
          <div class="spinner"></div>
          <h2>Conectando tu cuenta de MercadoPago...</h2>
          <p>Por favor espera un momento mientras procesamos la autorización.</p>
        </div>
      } @else if (success()) {
        <div class="callback-state success">
          <div class="icon success-icon">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="38" fill="#4CAF50" opacity="0.2" />
              <path
                d="M25 40l12 12 24-24"
                stroke="#4CAF50"
                stroke-width="4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <h2>¡Cuenta conectada exitosamente!</h2>
          <p>Ya puedes recibir pagos directos por tus alquileres.</p>
          <div class="actions">
            <button class="btn btn-primary" (click)="goToPublish()" type="button">
              Publicar un Auto
            </button>
            <button class="btn btn-secondary" (click)="goToProfile()" type="button">
              Ir a mi Perfil
            </button>
          </div>
        </div>
      } @else {
        <div class="callback-state error">
          <div class="icon error-icon">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="38" fill="#f44336" opacity="0.2" />
              <path
                d="M28 28l24 24M52 28L28 52"
                stroke="#f44336"
                stroke-width="4"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <h2>Error al conectar</h2>
          <p>{{ errorMessage() }}</p>
          <div class="actions">
            <button class="btn btn-primary" (click)="retry()" type="button">
              Intentar Nuevamente
            </button>
            <button class="btn btn-secondary" (click)="goToProfile()" type="button">
              Volver al Perfil
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .callback-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .callback-state {
        background: white;
        border-radius: 16px;
        padding: 48px 32px;
        max-width: 500px;
        width: 100%;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      }

      .icon {
        margin-bottom: 24px;
      }

      .spinner {
        border: 5px solid #f3f3f3;
        border-top: 5px solid #009ee3;
        border-radius: 50%;
        width: 80px;
        height: 80px;
        animation: spin 1s linear infinite;
        margin: 0 auto 24px;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      h2 {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
        margin: 0 0 12px 0;
      }

      p {
        font-size: 16px;
        color: #666;
        margin: 0 0 32px 0;
        line-height: 1.5;
      }

      .actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .btn {
        padding: 14px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: #009ee3;
        color: white;
      }

      .btn-primary:hover {
        background: #007bb5;
        transform: translateY(-2px);
      }

      .btn-secondary {
        background: #f5f5f5;
        color: #666;
      }

      .btn-secondary:hover {
        background: #e0e0e0;
      }

      @media (max-width: 600px) {
        .callback-state {
          padding: 32px 24px;
        }

        h2 {
          font-size: 20px;
        }

        p {
          font-size: 14px;
        }
      }
    `,
  ],
})
export class MercadoPagoCallbackPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private oauthService = inject(MercadoPagoOAuthService);

  processing = signal(true);
  success = signal(false);
  errorMessage = signal<string>('');

  async ngOnInit(): Promise<void> {
    // Obtener parámetros de la URL
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');
    const error = this.route.snapshot.queryParamMap.get('error');
    const errorDescription = this.route.snapshot.queryParamMap.get('error_description');

    // DEBUG: Log state para diagnóstico
    console.log('[MP Callback] Raw URL:', window.location.href);
    console.log('[MP Callback] Code:', code ? `${code.substring(0, 10)}...` : 'missing');
    console.log('[MP Callback] State received:', state);
    console.log('[MP Callback] State length:', state?.length);

    // Verificar si el usuario canceló
    if (error) {
      this.processing.set(false);
      this.errorMessage.set(
        error === 'access_denied'
          ? 'Cancelaste la autorización con MercadoPago'
          : errorDescription || 'Error en la autorización',
      );
      return;
    }

    // Verificar parámetros requeridos
    if (!code || !state) {
      this.processing.set(false);
      this.errorMessage.set('Parámetros de callback inválidos');
      return;
    }

    // Procesar callback
    try {
      const result = await this.oauthService.handleCallback(code, state);

      this.processing.set(false);

      if (result) {
        this.success.set(true);
      } else {
        this.errorMessage.set('Error al procesar la autorización');
      }
    } catch (err: unknown) {
      this.processing.set(false);
      this.errorMessage.set((err as Error).message || 'Error inesperado');
    }
  }

  goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  goToPublish(): void {
    this.router.navigate(['/cars/publish']);
  }

  retry(): void {
    this.router.navigate(['/profile/mercadopago-connect']);
  }
}
