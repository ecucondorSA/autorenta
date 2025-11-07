import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { InsuranceService } from '../../../core/services/insurance.service';
import { ClaimType, CLAIM_TYPE_LABELS } from '../../../core/models/insurance.model';

/**
 * Página para reportar siniestros/accidentes
 * Permite al usuario documentar y reportar daños durante el alquiler
 */
@Component({
  selector: 'app-report-claim',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar color="danger">
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="'/bookings/' + bookingId"></ion-back-button>
        </ion-buttons>
        <ion-title>Reportar Siniestro</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <form #claimForm="ngForm" (ngSubmit)="submitClaim()">
        <!-- Advertencia Importante -->
        <ion-card color="danger" class="warning-card">
          <ion-card-content>
            <div class="warning-content">
              <ion-icon name="alert-circle" size="large"></ion-icon>
              <div>
                <h3>⚠️ Importante</h3>
                <p>Si hubo lesionados o el vehículo no puede circular, llama de inmediato a:</p>
                <ion-button
                  expand="block"
                  color="light"
                  href="tel:0800-AUTORENTAR"
                  class="emergency-button"
                >
                  <ion-icon slot="start" name="call"></ion-icon>
                  0800-AUTORENTAR (24/7)
                </ion-button>
              </div>
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Información del Siniestro</ion-card-title>
          </ion-card-header>

          <ion-card-content>
            <!-- Tipo de Siniestro -->
            <ion-item>
              <ion-label position="stacked">
                Tipo de Siniestro *
                <ion-text color="danger"></ion-text>
              </ion-label>
              <ion-select
                [(ngModel)]="claimData.claim_type"
                name="claimType"
                required
                interface="action-sheet"
                placeholder="Selecciona el tipo"
              >
                <ion-select-option *ngFor="let type of claimTypes" [value]="type.value">
                  {{ type.label }}
                </ion-select-option>
              </ion-select>
            </ion-item>

            <!-- Fecha y Hora -->
            <ion-item>
              <ion-label position="stacked">
                Fecha y Hora del Incidente *
                <ion-text color="danger"></ion-text>
              </ion-label>
              <ion-datetime
                [(ngModel)]="claimData.incident_date"
                name="incidentDate"
                presentation="date-time"
                [max]="maxDate"
                required
              >
              </ion-datetime>
            </ion-item>

            <!-- Ubicación -->
            <ion-item>
              <ion-label position="stacked">
                Ubicación
                <ion-text color="medium">(opcional)</ion-text>
              </ion-label>
              <ion-input
                [(ngModel)]="claimData.location"
                name="location"
                placeholder="Ej: Av. Corrientes 1234, CABA"
                type="text"
              >
              </ion-input>
              <ion-button
                slot="end"
                fill="clear"
                (click)="useCurrentLocation()"
                [disabled]="gettingLocation"
              >
                <ion-icon [name]="gettingLocation ? 'hourglass' : 'location'" slot="icon-only">
                </ion-icon>
              </ion-button>
            </ion-item>

            <!-- Descripción -->
            <ion-item lines="none">
              <ion-label position="stacked">
                Descripción Detallada *
                <ion-text color="danger"></ion-text>
              </ion-label>
            </ion-item>
            <ion-item>
              <ion-textarea
                [(ngModel)]="claimData.description"
                name="description"
                rows="6"
                placeholder="Describe qué ocurrió, cómo sucedió, daños visibles, otros vehículos involucrados, etc."
                required
                counter="true"
                maxlength="1000"
              >
              </ion-textarea>
            </ion-item>

            <!-- Fotos -->
            <div class="photos-section">
              <h3>📸 Fotos del Siniestro</h3>
              <p class="photos-hint">
                <ion-icon name="information-circle"></ion-icon>
                Toma fotos de todos los ángulos del vehículo, especialmente los daños visibles.
              </p>

              <input
                type="file"
                accept="image/*"
                multiple
                (change)="onPhotosSelected($event)"
                #fileInput
                style="display: none;"
              />

              <ion-button
                expand="block"
                fill="outline"
                (click)="fileInput.click()"
                [disabled]="uploadedPhotos.length >= 10"
              >
                <ion-icon slot="start" name="camera"></ion-icon>
                {{ uploadedPhotos.length > 0 ? 'Agregar más fotos' : 'Tomar/Subir Fotos' }}
                ({{ uploadedPhotos.length }}/10)
              </ion-button>

              <div class="photo-preview" *ngIf="uploadedPhotos.length > 0">
                <div class="photo-item" *ngFor="let photo of uploadedPhotos; let i = index">
                  <img [src]="photo" [alt]="'Foto ' + (i + 1)" />
                  <ion-button
                    fill="clear"
                    color="danger"
                    class="delete-photo"
                    (click)="removePhoto(i)"
                  >
                    <ion-icon name="close-circle" slot="icon-only"></ion-icon>
                  </ion-button>
                </div>
              </div>
            </div>

            <!-- Denuncia Policial -->
            <ion-item>
              <ion-label position="stacked">
                N° Denuncia Policial
                <ion-text color="medium">(si aplica)</ion-text>
              </ion-label>
              <ion-input
                [(ngModel)]="claimData.police_report_number"
                name="policeReport"
                placeholder="Ej: 12345/2025"
                type="text"
              >
              </ion-input>
            </ion-item>

            <!-- Checkbox de confirmación -->
            <ion-item lines="none">
              <ion-checkbox [(ngModel)]="confirmDeclaration" name="confirm" labelPlacement="end">
                Declaro que la información proporcionada es verdadera y completa
              </ion-checkbox>
            </ion-item>

            <!-- Botón Submit -->
            <ion-button
              expand="block"
              type="submit"
              [disabled]="!claimForm.valid || submitting || !confirmDeclaration"
              color="danger"
              class="submit-button"
            >
              <ion-icon slot="start" [name]="submitting ? 'hourglass' : 'alert-circle'"></ion-icon>
              {{ submitting ? 'Enviando...' : 'Reportar Siniestro' }}
            </ion-button>

            <!-- Información Legal -->
            <ion-note color="medium" class="legal-note">
              <ion-icon name="information-circle"></ion-icon>
              Al reportar este siniestro, autorizas a la aseguradora a contactarte y verificar la
              información. La franquicia máxima que podrías pagar es
              {{ formatCurrency(maxDeductible) }}.
            </ion-note>
          </ion-card-content>
        </ion-card>

        <!-- Qué hacer después -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="checkmark-circle" color="primary"></ion-icon>
              ¿Qué hacer ahora?
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list lines="none">
              <ion-item>
                <ion-icon name="call" slot="start" color="primary"></ion-icon>
                <ion-label class="ion-text-wrap">
                  <h3>1. Contacta a la aseguradora</h3>
                  <p>Llama al 0800-AUTORENTAR (24/7) después de reportar</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-icon name="document-text" slot="start" color="primary"></ion-icon>
                <ion-label class="ion-text-wrap">
                  <h3>2. Espera instrucciones</h3>
                  <p>Un gestor te contactará en las próximas 2 horas</p>
                </ion-label>
              </ion-item>
              <ion-item>
                <ion-icon name="car" slot="start" color="primary"></ion-icon>
                <ion-label class="ion-text-wrap">
                  <h3>3. No muevas el vehículo</h3>
                  <p>A menos que sea necesario por seguridad</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </form>
    </ion-content>
  `,
  styles: [
    `
      ion-content {
        --background: var(--ion-color-light);
      }

      .warning-card {
        margin: 16px;
      }

      .warning-content {
        display: flex;
        gap: 16px;
        align-items: flex-start;
      }

      .warning-content ion-icon {
        flex-shrink: 0;
      }

      .warning-content h3 {
        margin: 0 0 8px 0;
        font-size: 1.1em;
      }

      .warning-content p {
        margin: 0 0 12px 0;
      }

      .emergency-button {
        margin-top: 8px;
      }

      .photos-section {
        margin: 20px 0;
        padding: 16px;
        background: var(--ion-color-light);
        border-radius: 8px;
      }

      .photos-section h3 {
        margin: 0 0 8px 0;
        font-size: 1em;
      }

      .photos-hint {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 8px 0 12px 0;
        font-size: 0.9em;
        color: var(--ion-color-medium);
      }

      .photos-hint ion-icon {
        flex-shrink: 0;
        margin-top: 2px;
      }

      .photo-preview {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
        margin-top: 12px;
      }

      .photo-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 8px;
        overflow: hidden;
        background: var(--ion-color-light-shade);
      }

      .photo-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .delete-photo {
        position: absolute;
        top: 4px;
        right: 4px;
        --padding-start: 4px;
        --padding-end: 4px;
      }

      .submit-button {
        margin-top: 24px;
      }

      .legal-note {
        display: flex;
        gap: 8px;
        margin-top: 16px;
        padding: 12px;
        background: var(--ion-color-light-shade);
        border-radius: 8px;
        font-size: 0.85em;
        line-height: 1.4;
      }

      .legal-note ion-icon {
        flex-shrink: 0;
        margin-top: 2px;
      }
    `,
  ],
})
export class ReportClaimPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly insuranceService = inject(InsuranceService);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  bookingId!: string;
  submitting = false;
  confirmDeclaration = false;
  gettingLocation = false;
  maxDeductible = 2000000; // Default

  claimData = {
    claim_type: 'collision' as ClaimType,
    description: '',
    incident_date: new Date().toISOString(),
    location: '',
    police_report_number: '',
  };

  uploadedPhotos: string[] = [];
  maxDate = new Date().toISOString();

  claimTypes = Object.entries(CLAIM_TYPE_LABELS).map(([value, label]) => ({
    value: value as ClaimType,
    label,
  }));

  ngOnInit() {
    this.bookingId = this.route.snapshot.paramMap.get('bookingId')!;
    if (!this.bookingId) {
      this.router.navigate(['/bookings']);
    }
  }

  async onPhotosSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - this.uploadedPhotos.length;
    const filesToProcess = Math.min(files.length, remainingSlots);

    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        await this.showToast('Imagen muy grande. Máximo 5MB por foto.', 'warning');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;
        if (result) {
          this.uploadedPhotos.push(result as string);
        }
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    input.value = '';
  }

  removePhoto(index: number) {
    this.uploadedPhotos.splice(index, 1);
  }

  async useCurrentLocation() {
    this.gettingLocation = true;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocoding simple (en producción usar API real)
      this.claimData.location = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;

      await this.showToast('Ubicación obtenida', 'success');
    } catch (__error) {
      await this.showToast('No se pudo obtener la ubicación', 'danger');
    } finally {
      this.gettingLocation = false;
    }
  }

  async submitClaim() {
    if (this.submitting) return;

    // Validaciones extra
    if (this.uploadedPhotos.length === 0) {
      const alert = await this.alertController.create({
        header: 'Fotos Recomendadas',
        message:
          '¿Estás seguro de reportar sin fotos? Las fotos ayudan a procesar el siniestro más rápido.',
        buttons: [
          { text: 'Agregar Fotos', role: 'cancel' },
          { text: 'Continuar Sin Fotos', handler: () => this.proceedWithSubmit() },
        ],
      });
      await alert.present();
      return;
    }

    await this.proceedWithSubmit();
  }

  private async proceedWithSubmit() {
    try {
      this.submitting = true;

      // Reportar siniestro
      const claimId = await this.insuranceService.reportClaim({
        booking_id: this.bookingId,
        ...this.claimData,
        photos: this.uploadedPhotos,
      });

      // Mostrar confirmación
      const alert = await this.alertController.create({
        header: '✅ Siniestro Reportado',
        message: `
          <p>Tu reporte ha sido registrado exitosamente.</p>
          <p><strong>N° de Siniestro:</strong> ${claimId.substring(0, 8).toUpperCase()}</p>
          <p>Un gestor de la aseguradora te contactará en las próximas 2 horas.</p>
          <p><strong>Importante:</strong> Llama ahora al 0800-AUTORENTAR para reportar verbalmente.</p>
        `,
        buttons: [
          {
            text: 'Llamar Ahora',
            handler: () => {
              window.location.href = 'tel:0800-AUTORENTAR';
            },
          },
          {
            text: 'OK',
            handler: () => {
              this.router.navigate(['/bookings', this.bookingId]);
            },
          },
        ],
      });
      await alert.present();
    } catch (error: unknown) {
      const alert = await this.alertController.create({
        header: '❌ Error',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo reportar el siniestro. Intenta nuevamente.',
        buttons: ['OK'],
      });
      await alert.present();
    } finally {
      this.submitting = false;
    }
  }

  private async showToast(message: string, color: string = 'dark') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
