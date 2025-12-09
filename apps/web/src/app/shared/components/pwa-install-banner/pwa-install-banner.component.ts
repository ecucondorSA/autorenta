import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaInstallService } from '../../../core/services/pwa-install.service';

/**
 * 📲 PWA Install Banner Component
 *
 * Banner personalizado para instalar la PWA
 */
@Component({
  selector: 'app-pwa-install-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="pwaService.showInstallPrompt()" class="pwa-install-banner">
      <button (click)="dismiss()" class="close-btn" aria-label="Cerrar">×</button>

      <div class="content">
        <div class="icon">
          <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="48" height="48" rx="10" fill="#d4f542"/>
            <g transform="translate(4, 14)">
              <path fill="#1f2937" d="M 3,18 C 3,16 5,12 8,10 L 11,8 C 14,6 17,4 21,4 L 29,4 C 32,4 34,5 36,8 L 38,11 C 39,12 40,14 40,17 L 40,20 C 40,21 39,21 38,21 L 35,21 C 34,19 32,17 29,17 C 26,17 24,20 24,21 L 16,21 C 15,20 13,17 10,17 C 7,17 6,20 5,21 L 3,21 C 2,21 1,20 1,19 Z"/>
              <path fill="#7dd3fc" d="M 12,6 C 11,7 10,9 9,11 L 15,11 L 15,6 Z"/>
              <path fill="#7dd3fc" d="M 17,5 L 26,5 C 29,6 31,8 33,11 L 17,11 Z"/>
              <circle cx="10" cy="21" r="4" fill="#0f172a"/>
              <circle cx="10" cy="21" r="2" fill="#64748b"/>
              <circle cx="29" cy="21" r="4" fill="#0f172a"/>
              <circle cx="29" cy="21" r="2" fill="#64748b"/>
              <ellipse cx="38" cy="14" rx="1.5" ry="2" fill="#fef9c3"/>
            </g>
          </svg>
        </div>

        <div class="text">
          <h3>Instalar Autorentar</h3>
          <p>Acceso rápido desde tu pantalla de inicio</p>
        </div>

        <button (click)="install()" class="install-btn">Instalar</button>
      </div>
    </div>
  `,
  styles: [
    `
      .pwa-install-banner {
        position: fixed;
        bottom: 80px;
        left: 16px;
        right: 16px;
        max-width: 400px;
        margin: 0 auto;
        background: var(
          --surface-info-dark,
          #2c4a52
        ); /* Replaced gradient with solid color token */
        color: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        padding: 20px;
        z-index: 1000;
        animation: slideUp 0.4s ease;
      }

      @keyframes slideUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .close-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 32px;
        height: 32px;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 50%;
        color: white;
        font-size: 24px;
        cursor: pointer;
      }

      .content {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .icon {
        width: 48px;
        height: 48px;
        flex-shrink: 0;
      }

      .icon svg {
        width: 100%;
        height: 100%;
      }

      .text h3 {
        margin: 0 0 4px 0;
        font-size: 18px;
      }

      .text p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
      }

      .install-btn {
        background: white;
        color: var(--text-info-dark, #2c4a52);
        border: none;
        padding: 10px 20px;
        border-radius: 24px;
        font-weight: 600;
        cursor: pointer;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PwaInstallBannerComponent {
  readonly pwaService = inject(PwaInstallService);

  async install(): Promise<void> {
    await this.pwaService.promptInstall();
  }

  dismiss(): void {
    this.pwaService.dismissPrompt();
  }
}
