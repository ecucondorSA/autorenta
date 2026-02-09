import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  VideoVehicleRecognitionComponent,
  DetectedVehicle,
} from '@shared/components/video-vehicle-recognition/video-vehicle-recognition.component';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cashOutline, shieldCheckmark, arrowBack, trophyOutline } from 'ionicons/icons';
import { ToastService } from '@core/services/ui/toast.service';

@Component({
  selector: 'app-scout-report',
  standalone: true,
  imports: [CommonModule, VideoVehicleRecognitionComponent, IonIcon, RouterLink],
  templateUrl: './scout-report.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #0f172a;
      }
    `,
  ],
})
export class ScoutReportPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  bookingId = signal<string | null>(null);
  scanSuccess = signal(false);
  isProcessing = signal(false);
  detectedData = signal<DetectedVehicle | null>(null);

  // Recompensa simulada
  rewardAmount = 500;

  constructor() {
    addIcons({ cashOutline, shieldCheckmark, arrowBack, trophyOutline });
  }

  ngOnInit() {
    this.bookingId.set(this.route.snapshot.paramMap.get('bookingId'));
  }

  onVehicleDetected(vehicle: DetectedVehicle) {
    this.detectedData.set(vehicle);

    // Simulación: Verificamos si es el vehículo buscado
    // En un hackathon, esto es el factor "Wow"
    if (vehicle.confidence > 70) {
      this.scanSuccess.set(true);
      this.toast.success('¡Vehículo Confirmado!', 'La IA ha validado la identidad del activo.');
    } else {
      this.toast.warning('Baja Confianza', 'Por favor, intenta acercarte más al vehículo.');
    }
  }

  async claimReward() {
    this.isProcessing.set(true);

    // Simulamos latencia de red/blockchain/pago
    await new Promise((resolve) => setTimeout(resolve, 2000));

    this.isProcessing.set(false);
    this.toast.success(
      '¡Pago Procesado!',
      `Se han acreditado $${this.rewardAmount} USD en tu billetera.`,
    );

    // Redirigir al mapa después del éxito
    setTimeout(() => {
      this.router.navigate(['/scout/map']);
    }, 3000);
  }
}
