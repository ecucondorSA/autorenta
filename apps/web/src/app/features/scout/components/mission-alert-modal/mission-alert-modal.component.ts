import { ChangeDetectionStrategy, Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalController } from '@ionic/angular/standalone';
import { IonicModule } from '@ionic/angular';
import { Bounty } from '@core/services/scout/scout.service';

@Component({
  selector: 'app-mission-alert-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <div
      class="h-full w-full bg-red-600 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden"
    >
      <!-- Fondo Pulsante -->
      <div class="absolute inset-0 bg-red-700 animate-pulse z-0"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-red-900/50 to-red-900/90 z-0"></div>

      <!-- Contenido -->
      <div class="relative z-10 w-full max-w-md text-center space-y-8">
        <!-- Icono Radar -->
        <div class="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div
            class="absolute inset-0 border-4 border-red-300 rounded-full animate-ping opacity-75"
          ></div>
          <div class="absolute inset-4 border-4 border-white rounded-full animate-pulse"></div>
          <i class="fas fa-crosshairs text-5xl text-white"></i>
        </div>

        <div>
          <h1 class="text-4xl font-black uppercase tracking-tighter leading-tight drop-shadow-lg">
            ¡OBJETIVO<br />DETECTADO!
          </h1>
          <p class="text-red-100 font-bold mt-2 text-lg animate-bounce">
            A 400 METROS DE TU POSICIÓN
          </p>
        </div>

        <!-- Car Info Box -->
        <div
          class="bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-red-400/50 shadow-2xl"
        >
          <div class="flex justify-between items-center mb-2">
            <span class="text-xs font-bold bg-red-500 px-2 py-1 rounded text-white">URGENTE</span>
            <span class="text-2xl font-black text-green-400">$150 USD</span>
          </div>
          <h2 class="text-2xl font-bold text-white">
            {{ mission.cars?.brand }} {{ mission.cars?.model }}
          </h2>
          <p class="text-gray-300">{{ mission.cars?.color }} • {{ mission.cars?.license_plate }}</p>
        </div>

        <!-- Countdown -->
        <div class="text-6xl font-black font-mono text-red-200 tracking-widest">
          00:{{ timeLeft | number: '2.0-0' }}
        </div>

        <!-- Actions -->
        <div class="grid grid-cols-1 gap-4 w-full">
          <button
            (click)="accept()"
            class="w-full bg-white text-red-700 h-16 rounded-xl font-black text-xl shadow-lg hover:bg-gray-100 transition-colors transform active:scale-95 flex items-center justify-center gap-3"
          >
            <i class="fas fa-check-circle"></i>
            ACEPTAR MISIÓN
          </button>

          <button
            (click)="reject()"
            class="w-full bg-transparent border-2 border-red-300/50 text-red-200 h-12 rounded-xl font-bold text-sm hover:bg-red-800/30"
          >
            IGNORAR
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        --background: transparent;
      }
    `,
  ],
})
export class MissionAlertModalComponent implements OnInit {
  private modalCtrl = inject(ModalController);
  @Input({ required: true }) mission!: Bounty;

  timeLeft = 30; // 30 segundos para aceptar
  interval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.startTimer();
  }

  startTimer() {
    this.interval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.reject(); // Auto-rechazo por timeout
      }
    }, 1000);
  }

  accept() {
    if (this.interval) clearInterval(this.interval);
    this.modalCtrl.dismiss({ accepted: true });
  }

  reject() {
    if (this.interval) clearInterval(this.interval);
    this.modalCtrl.dismiss({ accepted: false });
  }
}
