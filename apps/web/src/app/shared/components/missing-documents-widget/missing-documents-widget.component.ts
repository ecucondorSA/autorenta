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
            class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-4 mb-6"
          >
            <div class="flex items-start gap-4">
              <div class="flex-shrink-0">
                <span class="text-2xl">⚠️</span>
              </div>
              <div class="flex-1">
                <h3 class="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                  Documentos Faltantes
                </h3>
                <p class="text-sm text-amber-800 dark:text-amber-300 mb-3">
                  Necesitas completar tu verificación para publicar autos y recibir reservas.
                </p>

                <!-- Missing Documents List -->
                <div class="flex flex-wrap gap-2 mb-4">
                  @for (doc of missingDocs(); track doc) {
                    <span
                      class="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-800/40 text-amber-900 dark:text-amber-200 rounded-full text-sm font-medium"
                    >
                      <span>{{ getDocumentEmoji(doc) }}</span>
                      <span>{{ getDocumentLabel(doc) }}</span>
                    </span>
                  }
                </div>

                <!-- Action Button -->
                <a
                  routerLink="/verification"
                  class="inline-block px-4 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Completar Verificación →
                </a>
              </div>
              <button
                (click)="dismissAlert()"
                class="flex-shrink-0 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                aria-label="Cerrar alerta"
              >
                ✕
              </button>
            </div>
          </div>
        } @else if (verificationStatus()?.status === 'VERIFICADO') {
          <!-- Verified Badge -->
          <div
            class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-lg p-4 mb-6"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">✅</span>
              <div>
                <p class="font-semibold text-green-900 dark:text-green-200">
                  Verificación Completada
                </p>
                <p class="text-sm text-green-800 dark:text-green-300">
                  Tu cuenta está completamente verificada
                </p>
              </div>
            </div>
          </div>
        } @else if (verificationStatus()?.status === 'RECHAZADO') {
          <!-- Rejected Status -->
          <div
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg p-4 mb-6"
          >
            <div class="flex items-start gap-4">
              <span class="text-2xl flex-shrink-0">❌</span>
              <div class="flex-1">
                <p class="font-semibold text-red-900 dark:text-red-200 mb-2">
                  Verificación Rechazada
                </p>
                <p class="text-sm text-red-800 dark:text-red-300 mb-3">
                  {{
                    verificationStatus()?.notes ||
                      'Tu verificación fue rechazada. Contacta con soporte para más información.'
                  }}
                </p>
                <a
                  routerLink="/verification"
                  class="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white font-medium rounded-lg transition-colors text-sm"
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

  readonly verificationStatuses = this.verificationService.statuses;
  readonly verificationStatus = computed(() => this.verificationStatuses()[0] || null);
  readonly missingDocs = computed(() => this.verificationStatus()?.missing_docs || []);
  readonly missingDocsCount = computed(() => this.missingDocs().length);
  readonly hasVerificationStatus = computed(() => !!this.verificationStatus());
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
