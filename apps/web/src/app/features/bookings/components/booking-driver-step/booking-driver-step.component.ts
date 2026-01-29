import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BookingWizardData } from '@core/models/booking-wizard.model';

@Component({
  selector: 'app-booking-driver-step',
  standalone: true,
  imports: [FormsModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="driver-step-container">
      <div class="step-header">
        <h2>Información del conductor</h2>
        <p>Necesitamos verificar tu licencia de conducir</p>
      </div>

      <!-- Driver License -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Licencia de conducir</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">Número de licencia</ion-label>
            <ion-input
              [(ngModel)]="licenseNumber"
              (ngModelChange)="onDataChange()"
              placeholder="Ej: 12345678"
              type="text"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Fecha de expiración</ion-label>
            <ion-input
              [(ngModel)]="expirationDate"
              (ngModelChange)="onDataChange()"
              type="date"
            ></ion-input>
          </ion-item>
        </ion-card-content>
      </ion-card>

      <!-- Emergency Contact -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Contacto de emergencia</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">Nombre completo</ion-label>
            <ion-input
              [(ngModel)]="emergencyName"
              (ngModelChange)="onDataChange()"
              placeholder="Nombre del contacto"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Teléfono</ion-label>
            <ion-input
              [(ngModel)]="emergencyPhone"
              (ngModelChange)="onDataChange()"
              type="tel"
              placeholder="+54 9 11 1234-5678"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-label position="stacked">Relación</ion-label>
            <ion-select [(ngModel)]="relationship" (ngModelChange)="onDataChange()">
              <ion-select-option value="spouse">Cónyuge</ion-select-option>
              <ion-select-option value="parent">Padre/Madre</ion-select-option>
              <ion-select-option value="sibling">Hermano/a</ion-select-option>
              <ion-select-option value="friend">Amigo/a</ion-select-option>
              <ion-select-option value="other">Otro</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-card-content>
      </ion-card>

      @if (!isValid()) {
        <ion-note color="warning"> Por favor completa todos los campos requeridos </ion-note>
      }
    </div>
  `,
  styles: [
    `
      .driver-step-container {
        max-width: 600px;
        margin: 0 auto;
      }
      .step-header {
        text-align: center;
        margin-bottom: 1.5rem;
      }
      .step-header h2 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }
      .step-header p {
        color: var(--ion-color-medium);
      }
      ion-card {
        margin-bottom: 1.5rem;
      }
      ion-item {
        --padding-start: 0;
        margin-bottom: 0.75rem;
      }
    `,
  ],
})
export class BookingDriverStepComponent implements OnInit {
  @Input() data: BookingWizardData | null = null;
  @Output() dataChange = new EventEmitter<Partial<BookingWizardData>>();

  licenseNumber = signal('');
  expirationDate = signal('');
  emergencyName = signal('');
  emergencyPhone = signal('');
  relationship = signal('');

  isValid = computed(
    () =>
      this.licenseNumber() !== '' &&
      this.expirationDate() !== '' &&
      this.emergencyName() !== '' &&
      this.emergencyPhone() !== '' &&
      this.relationship() !== '',
  );

  ngOnInit() {
    if (this.data?.driverLicense) {
      this.licenseNumber.set(this.data.driverLicense.number || '');
      this.expirationDate.set(
        this.data.driverLicense.expirationDate?.toISOString().split('T')[0] || '',
      );
    }
    if (this.data?.emergencyContact) {
      this.emergencyName.set(this.data.emergencyContact.name || '');
      this.emergencyPhone.set(this.data.emergencyContact.phone || '');
      this.relationship.set(this.data.emergencyContact.relationship || '');
    }
  }

  onDataChange() {
    this.dataChange.emit({
      driverLicense: {
        number: this.licenseNumber(),
        expirationDate: this.expirationDate() ? new Date(this.expirationDate()) : null,
        frontPhoto: null,
        backPhoto: null,
      },
      emergencyContact: {
        name: this.emergencyName(),
        phone: this.emergencyPhone(),
        relationship: this.relationship(),
      },
    });
  }
}
