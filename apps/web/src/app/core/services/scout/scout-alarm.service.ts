import { Injectable, inject } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { ModalController } from '@ionic/angular/standalone';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { MissionAlertModalComponent } from '@features/scout/components/mission-alert-modal/mission-alert-modal.component';
import { Bounty } from '@core/models/bounty.model';

@Injectable({
  providedIn: 'root',
})
export class ScoutAlarmService {
  private modalCtrl = inject(ModalController);
  private logger = inject(LoggerService);
  private vibrationInterval: ReturnType<typeof setInterval> | null = null;
  private isAlarmActive = false;

  /**
   * ACTIVA LA ALARMA TÁCTICA
   * - Vibración infinita fuerte.
   * - Modal rojo de pantalla completa.
   */
  async triggerMissionAlert(missionData: Bounty) {
    if (this.isAlarmActive) return;
    this.isAlarmActive = true;

    // 1. Iniciar Secuencia de Vibración (Patrón SOS Pesado)
    this.startHeavyVibrationLoop();

    // 2. Abrir Modal de "Toma de Control"
    const modal = await this.modalCtrl.create({
      component: MissionAlertModalComponent,
      componentProps: { mission: missionData },
      cssClass: 'mission-alert-modal', // Definiremos esto en styles.css para que sea fullscreen
      backdropDismiss: false,
      keyboardClose: false,
    });

    await modal.present();

    // 3. Esperar a que el usuario decida
    const { data } = await modal.onDidDismiss();
    this.stopAlarm(); // Detener vibración al cerrar

    return data; // { accepted: true/false }
  }

  private startHeavyVibrationLoop() {
    // Vibrar inmediatamente
    this.vibratePattern();

    // Repetir cada 2.5 segundos (2s vibración + 0.5s pausa)
    this.vibrationInterval = setInterval(() => {
      this.vibratePattern();
    }, 2500);
  }

  private async vibratePattern() {
    try {
      // Intento 1: Vibración nativa larga (Android permite esto mejor)
      await Haptics.vibrate({ duration: 2000 });

      // Fallback/Adicional: Impactos fuertes para simular "golpes"
      // Si el motor no soporta duración larga, esto asegura que se sienta
      await Haptics.impact({ style: ImpactStyle.Heavy });
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 200);
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 400);
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 600);
    } catch (e) {
      this.logger.warn('Haptics not available', e);
    }
  }

  stopAlarm() {
    this.isAlarmActive = false;
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    // Detener cualquier vibración residual
    Haptics.vibrate({ duration: 0 });
  }
}
