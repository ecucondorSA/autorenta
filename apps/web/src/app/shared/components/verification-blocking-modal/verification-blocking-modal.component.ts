import {Component, Input, Output, EventEmitter, signal, inject,
  ChangeDetectionStrategy} from '@angular/core';

import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { VerificationService } from '../../../core/services/verification.service';
import { getDocumentEmoji, getDocumentLabel } from '../../../core/config/document-types.config';

export interface VerificationBlockingModalConfig {
  title: string;
  description: string;
  feature: string;
  requiredDocs?: string[];
}

@Component({
  selector: 'app-verification-blocking-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TranslateModule],
  template: `
    <div class="verification-blocking-modal" [class.open]="isOpen()">
      <!-- Backdrop -->
      <div class="modal-backdrop" (click)="onBackdropClick()" [class.open]="isOpen()"></div>

      <!-- Modal Content -->
      <div
        class="modal-container"
        [class.open]="isOpen()"
        role="dialog"
        aria-labelledby="modal-title"
      >
        <div
          class="bg-surface-raised dark:bg-surface-raised dark:bg-surface-raised rounded-lg shadow-xl p-6 max-w-md w-full"
        >
          <!-- Close Button -->
          <button
            (click)="close()"
            class="float-right text-text-secondary dark:text-text-secondary/70 hover:text-text-primary dark:hover:text-ivory-luminous"
            aria-label="Cerrar modal"
          >
            ✕
          </button>

          <!-- Icon -->
          <div class="text-center mb-4">
            <div class="text-6xl inline-block">🔐</div>
          </div>

          <!-- Title -->
          <h2
            id="modal-title"
            class="text-xl font-bold text-text-primary dark:text-text-primary text-center mb-2"
          >
            {{ config.title }}
          </h2>

          <!-- Description -->
          <p class="text-sm text-text-secondary dark:text-text-secondary/70 text-center mb-4">
            {{ config.description }}
          </p>

          <!-- Missing Documents Info -->
          @if (config.requiredDocs && config.requiredDocs.length > 0) {
            <div
              class="bg-warning-bg dark:bg-warning-900/20 border border-warning-border dark:border-warning-800/40 rounded-lg p-3 mb-6"
            >
              <p class="text-xs font-semibold text-warning-strong dark:text-warning-200 mb-2">
                Documentos requeridos:
              </p>
              <div class="flex flex-wrap gap-2">
                @for (doc of config.requiredDocs; track doc) {
                  <span
                    class="inline-flex items-center gap-1 px-2 py-1 bg-warning-bg-hover dark:bg-warning-800/40 text-warning-strong dark:text-warning-200 rounded text-xs font-medium"
                  >
                    <span>{{ getDocumentEmoji(doc) }}</span>
                    <span>{{ getDocumentLabel(doc) }}</span>
                  </span>
                }
              </div>
            </div>
          }

          <!-- Action Buttons -->
          <div class="flex gap-3 flex-col-reverse sm:flex-row">
            <button
              (click)="close()"
              class="flex-1 px-4 py-2 border border-border-default dark:border-neutral-700 text-text-primary dark:text-text-primary font-medium rounded-lg hover:bg-surface-base dark:hover:bg-graphite-dark transition-colors"
            >
              Cancelar
            </button>
            <a
              routerLink="/verification"
              (click)="close()"
              class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-text-inverse font-medium rounded-lg transition-colors text-center"
            >
              Verificar Ahora
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .verification-blocking-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        pointer-events: none;

        &.open {
          pointer-events: auto;
        }
      }

      .modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0);
        transition: background-color 0.3s ease;

        &.open {
          background-color: #4E4E4E;
        }
      }

      .modal-container {
        position: relative;
        transform: scale(0.95);
        opacity: 0;
        transition: all 0.3s ease;

        &.open {
          transform: scale(1);
          opacity: 1;
        }
      }
    `,
  ],
})
export class VerificationBlockingModalComponent {
  @Input() config: VerificationBlockingModalConfig = {
    title: 'Verificación Requerida',
    description: 'Completa tu verificación para acceder a esta función.',
    feature: 'this-feature',
  };
  @Output() closed = new EventEmitter<void>();

  private readonly verificationService = inject(VerificationService);

  readonly isOpen = signal(false);
  readonly missingDocs = this.verificationService.statuses;

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.closed.emit();
  }

  onBackdropClick() {
    this.close();
  }

  getDocumentEmoji(docId: string): string {
    return getDocumentEmoji(docId);
  }

  getDocumentLabel(docId: string): string {
    return getDocumentLabel(docId);
  }
}
