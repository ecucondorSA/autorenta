// ============================================
// Social Publisher Component
// ============================================

import { Component, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

interface PublishResponse {
  success: boolean;
  results: PublishResult[];
  totalTime: number;
}

@Component({
  selector: 'app-social-publisher',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  template: `
    <ion-card class="social-publisher">
      <ion-card-header>
        <ion-card-title>
          <ion-icon name="share-social"></ion-icon>
          Publicar en Redes Sociales
        </ion-card-title>
      </ion-card-header>

      <ion-card-content>
        <!-- Platform Selection -->
        <div class="platforms-section">
          <h3>Selecciona plataformas:</h3>
          <div class="platform-toggles">
            <ion-item lines="none" *ngFor="let platform of platforms()">
              <ion-label>
                <strong>{{ platform.label }}</strong>
              </ion-label>
              <ion-toggle
                [checked]="platform.selected()"
                (ionChange)="togglePlatform(platform.id)"
              ></ion-toggle>
            </ion-item>
          </div>
        </div>

        <!-- Content Editor -->
        <div class="content-section">
          <h3>Contenido:</h3>
          <ion-item>
            <ion-label position="floating">Texto del post</ion-label>
            <ion-textarea
              [(ngModel)]="contentText"
              [maxlength]="280"
              rows="4"
            ></ion-textarea>
          </ion-item>
          <div class="char-count">
            {{ contentText?.length || 0 }} / 280 caracteres
          </div>

          <!-- Hashtags -->
          <ion-item>
            <ion-label position="floating">Hashtags (separados por comas)</ion-label>
            <ion-input
              [(ngModel)]="hashtags"
              placeholder="#business,#marketing"
            ></ion-input>
          </ion-item>
        </div>

        <!-- Media Upload -->
        <div class="media-section">
          <h3>Multimedia (opcional):</h3>
          <ion-item>
            <ion-label>
              <strong>{{ selectedFiles().length }} archivo(s) seleccionado(s)</strong>
            </ion-label>
            <input
              #fileInput
              hidden
              type="file"
              multiple
              accept="image/*,video/*"
              (change)="onFilesSelected($event)"
            />
            <ion-button
              fill="outline"
              slot="end"
              (click)="fileInput.click()"
            >
              <ion-icon name="cloud-upload"></ion-icon>
              Subir
            </ion-button>
          </ion-item>

          <!-- File Preview -->
          <div class="file-list" *ngIf="selectedFiles().length > 0">
            <div class="file-item" *ngFor="let file of selectedFiles()">
              <div class="file-info">
                <ion-icon
                  [name]="file.type.startsWith('video') ? 'play' : 'image'"
                ></ion-icon>
                <div>
                  <strong>{{ file.name }}</strong>
                  <small>{{ (file.size / 1024).toFixed(2) }} KB</small>
                </div>
              </div>
              <ion-button
                fill="clear"
                color="danger"
                size="small"
                (click)="removeFile(file)"
              >
                <ion-icon name="trash"></ion-icon>
              </ion-button>
            </div>
          </div>
        </div>

        <!-- Scheduling -->
        <div class="scheduling-section">
          <ion-item>
            <ion-label position="floating">Agendar para más tarde (opcional)</ion-label>
            <ion-datetime
              [(ngModel)]="scheduledDate"
              display-format="DD/MM/YYYY HH:mm"
            ></ion-datetime>
          </ion-item>
        </div>

        <!-- Publishing Status -->
        <div class="status-section" *ngIf="isPublishing()">
          <ion-progress-bar type="indeterminate"></ion-progress-bar>
          <p class="publishing-text">Publicando en {{ selectedPlatforms().length }} plataforma(s)...</p>
        </div>

        <!-- Results -->
        <div class="results-section" *ngIf="publishResults()">
          <div class="result-item" *ngFor="let result of publishResults()!.results">
            <div
              [ngClass]="{ success: result.success, error: !result.success }"
              class="result-status"
            >
              <ion-icon
                [name]="result.success ? 'checkmark-circle' : 'close-circle'"
              ></ion-icon>
              <strong>{{ result.platform }}</strong>
              <small *ngIf="result.postId">ID: {{ result.postId }}</small>
              <small *ngIf="result.error">{{ result.error }}</small>
            </div>
          </div>
          <p class="timing">⏱️ Tiempo total: {{ publishResults()!.totalTime.toFixed(2) }}ms</p>
        </div>
      </ion-card-content>

      <!-- Action Buttons -->
      <ion-card-header class="actions">
        <ion-button
          expand="block"
          color="primary"
          (click)="publish()"
          [disabled]="isPublishing() || selectedPlatforms().length === 0 || !contentText"
        >
          <ion-icon name="rocket" slot="start"></ion-icon>
          {{ scheduledDate ? 'Agendar' : 'Publicar Ahora' }}
        </ion-button>

        <ion-button
          expand="block"
          fill="outline"
          (click)="reset()"
          [disabled]="isPublishing()"
        >
          <ion-icon name="refresh" slot="start"></ion-icon>
          Limpiar
        </ion-button>
      </ion-card-header>
    </ion-card>
  `,
  styles: [
    `
      .social-publisher {
        margin: 1rem;

        ion-card-header {
          ion-card-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            ion-icon {
              font-size: 1.5rem;
            }
          }
        }

        .platforms-section,
        .content-section,
        .media-section,
        .scheduling-section {
          margin-bottom: 1.5rem;

          h3 {
            margin: 0 0 1rem 0;
            font-size: 0.95rem;
            font-weight: 600;
            text-transform: uppercase;
            color: var(--ion-color-primary);
          }
        }

        .platform-toggles {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;

          @media (max-width: 600px) {
            grid-template-columns: 1fr;
          }

          ion-item {
            border-radius: 8px;
            border: 1px solid var(--ion-color-step-150);
            background: var(--ion-color-step-50);
          }
        }

        .char-count {
          font-size: 0.8rem;
          color: var(--ion-color-step-600);
          margin-top: 0.5rem;
          text-align: right;
        }

        .file-list {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;

          .file-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem;
            background: var(--ion-color-step-50);
            border-radius: 8px;
            border-left: 3px solid var(--ion-color-primary);

            .file-info {
              display: flex;
              align-items: center;
              gap: 0.75rem;

              ion-icon {
                font-size: 1.5rem;
                color: var(--ion-color-primary);
              }

              div {
                strong {
                  display: block;
                  font-size: 0.9rem;
                }
                small {
                  display: block;
                  color: var(--ion-color-step-600);
                  font-size: 0.8rem;
                }
              }
            }
          }
        }

        .status-section {
          margin: 1rem 0;
          p.publishing-text {
            text-align: center;
            color: var(--ion-color-primary);
            margin-top: 0.5rem;
          }
        }

        .results-section {
          margin: 1rem 0;

          .result-item {
            margin-bottom: 0.5rem;

            .result-status {
              display: flex;
              align-items: center;
              gap: 0.75rem;
              padding: 0.75rem;
              border-radius: 8px;
              border-left: 3px solid;

              ion-icon {
                font-size: 1.25rem;
              }

              strong {
                flex: 1;
                text-transform: capitalize;
              }

              small {
                display: block;
                font-size: 0.8rem;
                color: var(--ion-color-step-600);
              }

              &.success {
                background: var(--ion-color-success-tint);
                border-color: var(--ion-color-success);
                color: var(--ion-color-success);
              }

              &.error {
                background: var(--ion-color-danger-tint);
                border-color: var(--ion-color-danger);
                color: var(--ion-color-danger);
              }
            }
          }

          .timing {
            text-align: center;
            font-size: 0.9rem;
            color: var(--ion-color-step-600);
            margin-top: 1rem;
          }
        }

        .actions {
          border-top: 1px solid var(--ion-color-step-150);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;

          ion-button {
            margin: 0.5rem 0 !important;
          }
        }
      }
    `,
  ],
})
export class SocialPublisherComponent {
  // Signals
  contentText = signal('');
  hashtags = signal('');
  selectedFiles = signal<File[]>([]);
  scheduledDate = signal<string | undefined>(undefined);
  isPublishing = signal(false);
  publishResults = signal<PublishResponse | null>(null);

  // Platform selection
  platformsData = signal([
    { id: 'facebook', label: '📘 Facebook', selected: signal(true) },
    { id: 'instagram', label: '📷 Instagram', selected: signal(true) },
    { id: 'linkedin', label: '💼 LinkedIn', selected: signal(false) },
    { id: 'tiktok', label: '🎵 TikTok', selected: signal(false) },
  ]);

  platforms = computed(() => this.platformsData());
  selectedPlatforms = computed(() =>
    this.platforms().filter((p) => p.selected()).map((p) => p.id)
  );

  constructor() {
    // Auto-dismiss results after 5 seconds
    effect(() => {
      if (this.publishResults()) {
        setTimeout(() => this.publishResults.set(null), 5000);
      }
    });
  }

  togglePlatform(platformId: string) {
    const platforms = this.platformsData();
    const platform = platforms.find((p) => p.id === platformId);
    if (platform) {
      platform.selected.set(!platform.selected());
    }
  }

  onFilesSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = Array.from(target.files || []) as File[];
    this.selectedFiles.set([...this.selectedFiles(), ...files]);
  }

  removeFile(file: File) {
    const current = this.selectedFiles();
    this.selectedFiles.set(current.filter((f) => f !== file));
  }

  async publish() {
    if (this.isPublishing() || !this.contentText()) return;

    this.isPublishing.set(true);

    try {
      const apiKey = localStorage.getItem('SOCIAL_PUBLISHER_API_KEY');
      const baseUrl = localStorage.getItem('SOCIAL_PUBLISHER_URL') || 'http://localhost:3001';

      if (!apiKey) {
        throw new Error('API key not configured. Check localStorage settings.');
      }

      const publishRequest = {
        platforms: this.selectedPlatforms(),
        content: {
          text: this.contentText(),
          hashtags: this.hashtags()
            .split(',')
            .map((h) => h.trim())
            .filter((h) => h.length > 0),
          scheduledFor: this.scheduledDate() ? new Date(this.scheduledDate()!) : undefined,
        },
      };

      const response = await fetch(`${baseUrl}/api/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publishRequest),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }

      const data: PublishResponse = await response.json();
      this.publishResults.set(data);

      if (data.success) {
        this.reset();
      }
    } catch (error) {
      console.error('Publish error:', error);
      this.publishResults.set({
        success: false,
        results: this.selectedPlatforms().map((platform) => ({
          platform,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })),
        totalTime: 0,
      });
    } finally {
      this.isPublishing.set(false);
    }
  }

  reset() {
    this.contentText.set('');
    this.hashtags.set('');
    this.selectedFiles.set([]);
    this.scheduledDate.set(undefined);
    this.publishResults.set(null);
  }
}
