import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import type { VideoDamageAnalysis } from '@core/services/verification/video-damage-detection.service';

@Component({
  selector: 'app-damage-report',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <div class="damage-report">
      @if (analysis(); as data) {
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="search-circle"></ion-icon>
              Análisis de Inspección
            </ion-card-title>
            <ion-card-subtitle>
              {{ data.inspectionType === 'checkin' ? 'Check-In' : 'Check-Out' }}
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <p>{{ data.summary }}</p>
            <ion-badge [color]="data.confidence > 0.8 ? 'success' : 'warning'">
              {{ (data.confidence * 100).toFixed(0) }}% confianza
            </ion-badge>
          </ion-card-content>
        </ion-card>
        
        @if (data.damages.length > 0) {
          <ion-card>
            <ion-card-header>
              <ion-card-title>Daños Detectados ({{ data.damages.length }})</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                @for (damage of data.damages; track damage.id) {
                  <ion-item>
                    <ion-label>
                      <h3>{{ damage.type }}</h3>
                      <p>{{ damage.description }}</p>
                      <p class="meta">{{ damage.location }} • {{ damage.timestamp }}s</p>
                    </ion-label>
                    <ion-badge slot="end" [color]="damage.severity === 'severe' ? 'danger' : 'warning'">
                      {{ damage.severity }}
                    </ion-badge>
                  </ion-item>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>
        } @else {
          <ion-card>
            <ion-card-content>
              <div class="no-damages">
                <ion-icon name="checkmark-circle" color="success" size="large"></ion-icon>
                <p>No se detectaron daños</p>
              </div>
            </ion-card-content>
          </ion-card>
        }
      } @else {
        <ion-card>
          <ion-card-content>
            <div class="loading">
              <ion-spinner></ion-spinner>
              <p>Analizando video...</p>
            </div>
          </ion-card-content>
        </ion-card>
      }
    </div>
  `,
  styles: [`
    .damage-report { padding: 16px; }
    .meta { font-size: 12px; color: var(--ion-color-medium); }
    .no-damages { text-align: center; padding: 32px 16px; }
    .no-damages ion-icon { font-size: 64px; margin-bottom: 16px; }
    .loading { text-align: center; padding: 32px 16px; }
  `]
})
export class DamageReportComponent {
  analysis = input<VideoDamageAnalysis | null>(null);
}
