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
        <div class="icon">📱</div>

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
        background: var(--surface-info-dark, #2c4a52); /* Replaced gradient with solid color token */
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
        font-size: 48px;
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
