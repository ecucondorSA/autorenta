import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { VerificationService } from '../../core/services/verification.service';
import {
  DocumentTypeConfig,
  DOCUMENT_TYPES,
  getDocumentsByCategory,
} from '../../core/config/document-types.config';

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div
      class="verification-page bg-ivory-soft dark:bg-graphite-dark min-h-screen transition-colors duration-300"
    >
      <!-- Header -->
      <div
        class="bg-white dark:bg-slate-deep-pure dark:bg-anthracite border-b border-pearl-gray dark:border-neutral-800/60 transition-colors duration-300"
      >
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center gap-3 mb-2">
            <a routerLink="/" class="text-primary-600 hover:text-primary-700">← Atrás</a>
          </div>
          <h1 class="text-3xl font-bold text-smoke-black dark:text-ivory-luminous">
            Verificación de Cuenta
          </h1>
          <p class="mt-2 text-charcoal-medium dark:text-pearl-light/70">
            Completa tu verificación para publicar autos y recibir reservas
          </p>
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        @if (verificationStatus(); as status) {
          <!-- Status Summary -->
          <div
            class="bg-white dark:bg-slate-deep-pure dark:bg-anthracite rounded-lg shadow-sm border border-pearl-gray dark:border-neutral-800/60 p-6 mb-8"
          >
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-xl font-semibold text-smoke-black dark:text-ivory-luminous mb-2">
                  Estado de Verificación
                </h2>
                <div class="flex items-center gap-3">
                  @switch (status.status) {
                    @case ('VERIFICADO') {
                      <span
                        class="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-200 rounded-full font-medium text-sm"
                      >
                        <span>✅</span>
                        <span>Verificado</span>
                      </span>
                    }
                    @case ('PENDIENTE') {
                      <span
                        class="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded-full font-medium text-sm"
                      >
                        <span>⏳</span>
                        <span>Pendiente</span>
                      </span>
                    }
                    @case ('RECHAZADO') {
                      <span
                        class="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-200 rounded-full font-medium text-sm"
                      >
                        <span>❌</span>
                        <span>Rechazado</span>
                      </span>
                    }
                  }
                </div>
              </div>
              @if (status.status !== 'VERIFICADO') {
                <button
                  (click)="triggerVerification()"
                  [disabled]="isVerifying()"
                  class="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
                >
                  {{ isVerifying() ? 'Verificando...' : 'Verificar Ahora' }}
                </button>
              }
            </div>

            @if (status.notes) {
              <div
                class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded p-3 text-sm text-red-800 dark:text-red-300"
              >
                {{ status.notes }}
              </div>
            }
          </div>

          <!-- Missing Documents Section -->
          @if (missingDocs().length > 0) {
            <div
              class="bg-white dark:bg-slate-deep-pure dark:bg-anthracite rounded-lg shadow-sm border border-pearl-gray dark:border-neutral-800/60 p-6 mb-8"
            >
              <h2 class="text-xl font-semibold text-smoke-black dark:text-ivory-luminous mb-6">
                📋 Documentos Faltantes ({{ missingDocs().length }})
              </h2>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (docId of missingDocs(); track docId) {
                  @if (getDocConfig(docId); as docConfig) {
                    <div
                      class="border border-amber-200 dark:border-amber-800/40 rounded-lg p-4 bg-amber-50 dark:bg-amber-900/20 hover:shadow-md transition-shadow"
                    >
                      <div class="flex items-start gap-4">
                        <span class="text-3xl flex-shrink-0">{{ docConfig.emoji }}</span>
                        <div class="flex-1 min-w-0">
                          <h3 class="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                            {{ docConfig.label }}
                          </h3>
                          <p class="text-sm text-amber-800 dark:text-amber-300 mb-3">
                            {{ docConfig.description }}
                          </p>
                          <a
                            routerLink="/profile"
                            class="inline-flex items-center gap-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-600 text-white font-medium rounded text-sm transition-colors"
                          >
                            <span>📤</span>
                            <span>Subir Documento</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          } @else if (status.status === 'VERIFICADO') {
            <!-- Success State -->
            <div
              class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-lg p-8 text-center"
            >
              <div class="text-6xl mb-4">✅</div>
              <h2 class="text-2xl font-bold text-green-900 dark:text-green-200 mb-2">
                ¡Verificación Completada!
              </h2>
              <p class="text-green-800 dark:text-green-300 mb-6">
                Tu cuenta está completamente verificada. Ahora puedes publicar autos y recibir
                reservas.
              </p>
              <a
                routerLink="/cars/publish"
                class="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                Publicar mi primer auto →
              </a>
            </div>
          }

          <!-- Verification Help Section -->
          <div
            class="bg-white dark:bg-slate-deep-pure dark:bg-anthracite rounded-lg shadow-sm border border-pearl-gray dark:border-neutral-800/60 p-6 mt-8"
          >
            <h2 class="text-xl font-semibold text-smoke-black dark:text-ivory-luminous mb-4">
              ❓ Preguntas Frecuentes
            </h2>

            <div class="space-y-4">
              <details
                class="group border border-pearl-gray dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:bg-ivory-soft dark:hover:bg-graphite-dark transition-colors"
              >
                <summary
                  class="font-medium text-smoke-black dark:text-ivory-luminous flex items-center justify-between"
                >
                  ¿Por qué necesito verificarme?
                  <span class="text-lg group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p class="mt-3 text-charcoal-medium dark:text-pearl-light/70 text-sm">
                  La verificación es obligatoria para proteger a los usuarios de AutoRenta. Nos
                  permite confirmar tu identidad y asegurar que todos en nuestra plataforma sean
                  personas confiables.
                </p>
              </details>

              <details
                class="group border border-pearl-gray dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:bg-ivory-soft dark:hover:bg-graphite-dark transition-colors"
              >
                <summary
                  class="font-medium text-smoke-black dark:text-ivory-luminous flex items-center justify-between"
                >
                  ¿Cuánto tiempo toma la verificación?
                  <span class="text-lg group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p class="mt-3 text-charcoal-medium dark:text-pearl-light/70 text-sm">
                  La mayoría de las verificaciones se completan en 24-48 horas. Algunos casos pueden
                  requerir revisión manual adicional.
                </p>
              </details>

              <details
                class="group border border-pearl-gray dark:border-neutral-700 rounded-lg p-4 cursor-pointer hover:bg-ivory-soft dark:hover:bg-graphite-dark transition-colors"
              >
                <summary
                  class="font-medium text-smoke-black dark:text-ivory-luminous flex items-center justify-between"
                >
                  ¿Es seguro compartir mis documentos?
                  <span class="text-lg group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p class="mt-3 text-charcoal-medium dark:text-pearl-light/70 text-sm">
                  Sí. Todos tus documentos se almacenan en servidores seguros con encriptación de
                  punta a punta. Solo nuestro equipo de verificación tiene acceso a ellos.
                </p>
              </details>
            </div>
          </div>
        } @else {
          <!-- Loading State -->
          <div class="flex justify-center items-center py-12">
            <svg class="animate-spin h-12 w-12 text-primary-600" fill="none" viewBox="0 0 24 24">
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
        }
      </div>
    </div>
  `,
  styles: [
    `
      .verification-page {
        min-height: 100vh;
      }
    `,
  ],
})
export class VerificationPage implements OnInit {
  private readonly verificationService = inject(VerificationService);

  readonly verificationStatus = this.verificationService.statuses;
  readonly isVerifying = signal(false);
  readonly missingDocs = computed(() => this.verificationStatus()?.[0]?.missing_docs || []);

  ngOnInit() {
    this.verificationService.loadStatuses();
  }

  triggerVerification() {
    this.isVerifying.set(true);
    this.verificationService
      .triggerVerification()
      .then(() => {
        this.isVerifying.set(false);
      })
      .catch(() => {
        this.isVerifying.set(false);
      });
  }

  getDocConfig(docId: string): DocumentTypeConfig | undefined {
    return DOCUMENT_TYPES[docId];
  }
}
