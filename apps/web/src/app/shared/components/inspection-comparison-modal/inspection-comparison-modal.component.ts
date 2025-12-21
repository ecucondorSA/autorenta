import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { VideoDamageDetectionService } from '../../../core/services/video-damage-detection.service';

@Component({
  selector: 'app-inspection-comparison-modal',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Comparación Check-In vs Check-Out</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      @if (comparisonResult(); as result) {
        <ion-card [color]="result.newDamages.length > 0 ? 'warning' : 'success'">
          <ion-card-header>
            <ion-card-title>
              @if (result.newDamages.length > 0) {
                <ion-icon name="warning"></ion-icon>
                {{ result.newDamages.length }} Daño(s) Nuevo(s)
              } @else {
                <ion-icon name="checkmark-circle"></ion-icon>
                Sin Daños Nuevos
              }
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ result.summary }}</p>
            @if (result.totalEstimatedCost > 0) {
              <div class="cost">\${{ result.totalEstimatedCost.toFixed(2) }} USD</div>
            }
          </ion-card-content>
        </ion-card>
        
        @if (result.newDamages.length > 0) {
          <ion-list>
            @for (damage of result.newDamages; track damage.id) {
              <ion-item>
                <ion-label>
                  <h3>{{ damage.type }}</h3>
                  <p>{{ damage.description }} - {{ damage.location }}</p>
                </ion-label>
                <ion-badge slot="end">\${{ damage.estimatedCostUsd }}</ion-badge>
              </ion-item>
            }
          </ion-list>
          
          <div class="actions">
            <ion-button expand="block" color="danger" (click)="openDispute()">
              Abrir Disputa
            </ion-button>
            <ion-button expand="block" fill="outline" (click)="acceptCharges()">
              Aceptar Cargos
            </ion-button>
          </div>
        }
      } @else {
        <div class="loading">
          <ion-spinner></ion-spinner>
          <p>Comparando inspecciones...</p>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .cost { margin-top: 12px; font-size: 20px; font-weight: bold; }
    .loading { text-align: center; padding: 64px 16px; }
    .actions { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  `]
})
export class InspectionComparisonModalComponent {
  private modalCtrl = inject(ModalController);
  private videoService = inject(VideoDamageDetectionService);
  
  bookingId = input.required<string>();
  comparisonResult = signal<any>(null);
  
  async ngOnInit() {
    try {
      const result = await this.videoService.compareInspections(this.bookingId());
      this.comparisonResult.set(result);
    } catch (error) {
      console.error('Error comparing inspections:', error);
    }
  }
  
  dismiss() {
    this.modalCtrl.dismiss();
  }
  
  openDispute() {
    this.modalCtrl.dismiss({ action: 'dispute' });
  }
  
  acceptCharges() {
    this.modalCtrl.dismiss({ 
      action: 'accept', 
      amount: this.comparisonResult()?.totalEstimatedCost 
    });
  }
}
