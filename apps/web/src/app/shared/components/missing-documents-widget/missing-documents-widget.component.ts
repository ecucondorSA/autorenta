import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { VerificationService } from '../../../core/services/verification.service';
import { getDocumentEmoji, getDocumentLabel } from '../../../core/config/document-types.config';

@Component({
  selector: 'app-missing-documents-widget',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="missing-documents-widget">
      @if (hasVerificationStatus()) {
        @if (missingDocsCount() > 0) {
          <!-- Missing Documents Alert -->
          <div
            class="bg-warning-bg dark:bg-warning-900/20 border border-warning-border dark:border-warning-800/40 rounded-lg p-4 mb-6"
          >
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0 text-xl">
                <span>⚠️</span>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-warning-strong dark:text-warning-200 mb-2">
                  Documentos Faltantes
                </h3>
                <p class="text-sm text-warning-strong dark:text-warning-300 mb-3">
                  Necesitas completar tu verificación para publicar autos y recibir reservas.
                </p>

                <!-- Missing Documents List -->
                <div class="flex flex-wrap gap-2 mb-4">
                  @for (doc of missingDocs(); track doc) {
                    <span
                      class="inline-flex items-center gap-1 px-3 py-1 bg-warning-bg-hover dark:bg-warning-800/40 text-warning-strong dark:text-warning-200 rounded-full text-sm font-medium"
                    >
                      <span>{{ getDocumentEmoji(doc) }}</span>
                      <span>{{ getDocumentLabel(doc) }}</span>
                    </span>
                  }
                </div>

                <!-- Action Button -->
                <a
                  routerLink="/verification"
                  class="inline-block px-4 py-2 bg-warning-600 hover:bg-warning-700 dark:bg-warning-700 dark:hover:bg-warning-600 text-text-inverse font-medium rounded-lg transition-colors text-sm"
                >
                  Completar Verificación →
                </a>
              </div>
              <button
                (click)="dismissAlert()"
                class="flex-shrink-0 text-warning-text dark:text-warning-400 hover:text-warning-strong dark:hover:text-warning-300"
                aria-label="Cerrar alerta"
              >
                ✕
              </button>
            </div>
          </div>
        } @else if (currentStatus()?.status === 'VERIFICADO') {
          <!-- Verified Badge -->
          <div
            class="bg-success-light/10 dark:bg-success-light/20 border border-success-light/40 dark:border-success-light/40 rounded-lg p-4 mb-6"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">✅</span>
              <div>
                <p class="font-semibold text-success-light dark:text-success-light">
                  Verificación Completada
                </p>
                <p class="text-sm text-success-light dark:text-success-light">
                  Tu cuenta está completamente verificada
                </p>
              </div>
            </div>
          </div>
        } @else if (currentStatus()?.status === 'RECHAZADO') {
          <!-- Rejected Status -->
          <div
            class="bg-error-bg dark:bg-error-900/20 border border-error-border dark:border-error-800/40 rounded-lg p-4 mb-6"
          >
            <div class="flex items-start gap-4">
              <span class="text-xl flex-shrink-0">❌</span>
              <div class="flex-1">
                <p class="font-semibold text-error-strong mb-2">Verificación Rechazada</p>
                <p class="text-sm text-error-strong mb-3">
                  {{
                    currentStatus()?.notes ||
                      'Tu verificación fue rechazada. Contacta con soporte para más información.'
                  }}
                </p>
                <a
                  routerLink="/verification"
                  class="inline-block px-4 py-2 bg-error-600 hover:bg-error-700 dark:bg-error-700 dark:hover:bg-error-600 text-text-inverse font-medium rounded-lg transition-colors text-sm"
                >
                  Reintentar Verificación →
                </a>
              </div>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .missing-documents-widget {
        width: 100%;
      }
    `,
  ],
})
export class MissingDocumentsWidgetComponent implements OnInit {
  private readonly verificationService = inject(VerificationService);

  readonly verificationStatus = this.verificationService.statuses;
  readonly currentStatus = computed(() => {
    const statuses = this.verificationStatus();
    return statuses && statuses.length > 0 ? statuses[0] : null;
  });
  readonly missingDocs = computed(() => this.currentStatus()?.missing_docs || []);
  readonly missingDocsCount = computed(() => this.missingDocs().length);
  readonly hasVerificationStatus = computed(() => !!this.currentStatus());
  readonly showDismissed = signal(false);

  ngOnInit() {
    // Load verification status
    this.verificationService.loadStatuses();
  }

  dismissAlert() {
    this.showDismissed.set(true);
  }

  getDocumentEmoji(docId: string): string {
    return getDocumentEmoji(docId);
  }

  getDocumentLabel(docId: string): string {
    return getDocumentLabel(docId);
  }
}
