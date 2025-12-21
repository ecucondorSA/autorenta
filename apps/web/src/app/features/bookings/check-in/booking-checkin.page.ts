import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonicModule, ToastController } from '@ionic/angular';
import { VideoDamageAnalysis, VideoDamageDetectionService } from '../../../core/services/video-damage-detection.service';
import { DamageReportComponent } from '../../../shared/components/damage-report/damage-report.component';
import { VideoInspectionRecorderComponent } from '../../../shared/components/video-inspection-recorder/video-inspection-recorder.component';

/**
 * Booking Check-In Page
 *
 * Página para que el Owner grabe la inspección de check-in
 * antes de entregarle el auto al Renter.
 *
 * Flujo:
 * 1. Owner graba video del auto (90s mínimo)
 * 2. Video se sube automáticamente a GCP
 * 3. Vertex AI analiza el video (30-60s)
 * 4. Se muestran los daños detectados
 * 5. Owner confirma la inspección
 */
@Component({
  selector: 'app-booking-checkin',
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    VideoInspectionRecorderComponent,
    DamageReportComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/bookings"></ion-back-button>
        </ion-buttons>
        <ion-title>Check-In: Inspección del Vehículo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="checkin-container">

        <!-- Header Info -->
        <ion-card class="info-card">
          <ion-card-content>
            <h2>
              <ion-icon name="car-sport"></ion-icon>
              {{ carBrand() }} {{ carModel() }}
            </h2>
            <p>Booking ID: <strong>{{ bookingId() }}</strong></p>
            <ion-note>
              Graba un video completo del vehículo antes de entregarlo.
              La IA detectará automáticamente cualquier daño existente.
            </ion-note>
          </ion-card-content>
        </ion-card>

        <!-- Step 1: Record Video -->
        @if (!videoUploaded()) {
          <app-video-inspection-recorder
            [bookingId]="bookingId()"
            [carId]="carId()"
            [inspectionType]="'checkin'"
            (videoUploaded)="onVideoUploaded($event)"
            (error)="onError($event)">
          </app-video-inspection-recorder>
        }

        <!-- Step 2: Analyzing Video -->
        @if (videoUploaded() && !analysisResult()) {
          <ion-card class="analyzing-card">
            <ion-card-content>
              <div class="analyzing">
                <ion-spinner name="crescent" color="primary"></ion-spinner>
                <h3>Analizando video con IA...</h3>
                <p>Vertex AI está procesando el video</p>
                <p class="small">Esto tomará 30-60 segundos</p>
                <ion-progress-bar type="indeterminate"></ion-progress-bar>

                <div class="tips">
                  <ion-note>
                    <ion-icon name="information-circle"></ion-icon>
                    La IA está detectando:
                  </ion-note>
                  <ul>
                    <li>Rayones y abolladuras</li>
                    <li>Luces rotas o dañadas</li>
                    <li>Desgaste de llantas</li>
                    <li>Daños en el interior</li>
                    <li>Comportamientos sospechosos</li>
                  </ul>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- Step 3: Show Results -->
        @if (analysisResult()) {
          <app-damage-report [analysis]="analysisResult()"></app-damage-report>

          <!-- Actions -->
          <div class="actions">
            <ion-button
              expand="block"
              color="primary"
              (click)="confirmInspection()"
              [disabled]="isSubmitting()">
              @if (!isSubmitting()) {
                <ion-icon slot="start" name="checkmark-circle"></ion-icon>
                Confirmar Inspección de Check-In
              } @else {
                <ion-spinner slot="start"></ion-spinner>
                Guardando...
              }
            </ion-button>

            <ion-button
              expand="block"
              fill="outline"
              (click)="retakeVideo()">
              <ion-icon slot="start" name="videocam"></ion-icon>
              Grabar Nuevo Video
            </ion-button>
          </div>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    .checkin-container {
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
    }

    .info-card h2 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
    }

    .info-card ion-note {
      display: block;
      margin-top: 12px;
      line-height: 1.5;
    }

    .analyzing-card {
      margin-top: 16px;
    }

    .analyzing {
      text-align: center;
      padding: 32px 16px;
    }

    .analyzing ion-spinner {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .analyzing h3 {
      margin: 16px 0 8px 0;
    }

    .analyzing p {
      margin: 4px 0;
      color: var(--ion-color-medium);
    }

    .analyzing .small {
      font-size: 14px;
    }

    .analyzing ion-progress-bar {
      margin: 16px 0;
    }

    .tips {
      margin-top: 24px;
      text-align: left;
      background: var(--ion-color-light);
      padding: 16px;
      border-radius: 8px;
    }

    .tips ion-note {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: bold;
      margin-bottom: 12px;
    }

    .tips ul {
      margin: 0;
      padding-left: 20px;
    }

    .tips li {
      margin-bottom: 8px;
      line-height: 1.5;
    }

    .actions {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
  `]
})
export class BookingCheckinPage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private videoService = inject(VideoDamageDetectionService);
  private toastCtrl = inject(ToastController);

  // Route params
  bookingId = signal('');
  carId = signal('');
  carBrand = signal('');
  carModel = signal('');

  // State
  videoUploaded = signal(false);
  analysisResult = signal<VideoDamageAnalysis | null>(null);
  isSubmitting = signal(false);

  ngOnInit() {
    // Get params from route
    this.bookingId.set(this.route.snapshot.params['id'] || 'booking_123');
    this.carId.set(this.route.snapshot.queryParams['carId'] || 'car_456');
    this.carBrand.set(this.route.snapshot.queryParams['brand'] || 'Tesla');
    this.carModel.set(this.route.snapshot.queryParams['model'] || 'Model 3');
  }

  async onVideoUploaded(videoPath: string) {
    this.videoUploaded.set(true);

    // Show toast
    const toast = await this.toastCtrl.create({
      message: '✅ Video subido. Analizando con IA...',
      duration: 3000,
      color: 'success'
    });
    await toast.present();

    // Subscribe to real-time results
    this.videoService.subscribeToAnalysisResults(
      this.bookingId(),
      (analysis) => {
        this.analysisResult.set(analysis);
        this.showAnalysisToast(analysis);
      }
    );
  }

  async onError(error: string) {
    const toast = await this.toastCtrl.create({
      message: `❌ Error: ${error}`,
      duration: 5000,
      color: 'danger'
    });
    await toast.present();
  }

  async showAnalysisToast(analysis: VideoDamageAnalysis) {
    const message = analysis.damages.length > 0
      ? `⚠️ Se detectaron ${analysis.damages.length} daño(s)`
      : '✅ No se detectaron daños';

    const toast = await this.toastCtrl.create({
      message,
      duration: 5000,
      color: analysis.damages.length > 0 ? 'warning' : 'success'
    });
    await toast.present();
  }

  async confirmInspection() {
    this.isSubmitting.set(true);

    try {
      // TODO: Call booking service to update status
      // await this.bookingService.confirmCheckin(this.bookingId());

      const toast = await this.toastCtrl.create({
        message: '✅ Check-In confirmado exitosamente',
        duration: 3000,
        color: 'success'
      });
      await toast.present();

      // Navigate back to booking detail
      setTimeout(() => {
        this.router.navigate(['/bookings', this.bookingId()]);
      }, 1000);

    } catch (error) {
      const toast = await this.toastCtrl.create({
        message: '❌ Error al confirmar check-in',
        duration: 5000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  retakeVideo() {
    this.videoUploaded.set(false);
    this.analysisResult.set(null);
  }
}
