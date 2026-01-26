import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ScoutService, Bounty } from '../../services/scout.service';
import { ScoutAlarmService } from '../../services/scout-alarm.service';

@Component({
  selector: 'app-missions-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-50 pb-20">
      <!-- HEADER -->
      <div class="bg-indigo-700 text-white p-6 rounded-b-3xl shadow-lg relative">
        <h1 class="text-2xl font-bold">Misiones Scout</h1>
        <p class="text-indigo-100 text-sm">Encuentra vehículos y gana recompensas</p>
        
        <!-- BOTÓN DE PRUEBA (MOCK ALARM) -->
        <button (click)="simulateAlert()" 
                class="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black px-3 py-2 rounded-full shadow-lg animate-pulse uppercase tracking-tighter">
          Simular Alerta
        </button>

        <div class="mt-4 bg-indigo-800/50 p-4 rounded-2xl flex justify-between items-center">
          <div>
            <p class="text-xs text-indigo-300 uppercase font-bold tracking-wider">Tu Wallet</p>
            <p class="text-xl font-bold">$0.00 USD</p>
          </div>
          <div class="bg-indigo-400/20 p-3 rounded-full">
            <i class="fas fa-wallet text-indigo-200"></i>
          </div>
        </div>
      </div>

      <!-- FILTRO / SEARCH (Placeholder) -->
      <div class="p-4">
        <div class="flex gap-2 overflow-x-auto no-scrollbar py-2">
          <span class="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold whitespace-nowrap">Cerca de mí</span>
          <span class="px-4 py-2 bg-white text-gray-500 rounded-full text-xs font-medium whitespace-nowrap border">Alta Prioridad</span>
          <span class="px-4 py-2 bg-white text-gray-500 rounded-full text-xs font-medium whitespace-nowrap border">Nuevos</span>
        </div>
      </div>

      <!-- MISSIONS LIST -->
      <div class="px-4 space-y-4">
        @for (mission of scout.activeMissions(); track mission.id) {
          <div [routerLink]="['/scout/mission', mission.id]" 
               class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-4 active:scale-95 transition-transform">
            
            <!-- Car Image Thumbnail -->
            <div class="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
              <img [src]="mission.cars?.photos?.[0] || 'assets/placeholders/car-placeholder.png'" 
                   alt="Vehículo de la misión"
                   class="w-full h-full object-cover">
            </div>

            <!-- Mission Details -->
            <div class="flex-1 flex flex-col justify-between">
              <div>
                <div class="flex justify-between items-start">
                  <h3 class="font-bold text-gray-900">{{ mission.cars?.brand }} {{ mission.cars?.model }}</h3>
                  <span class="text-green-600 font-black text-sm">+ \${{ mission.reward_amount }}</span>
                </div>
                <p class="text-xs text-gray-500">{{ mission.cars?.color }} • {{ mission.cars?.year }}</p>
                <div class="mt-1 flex items-center gap-1 text-[10px] text-indigo-600 font-bold">
                  <i class="fas fa-location-arrow"></i>
                  <span>Aprox. 450m</span>
                </div>
              </div>

              <div class="flex justify-end">
                <span class="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-mono">
                  PATENTE: {{ mission.cars?.license_plate | slice:0:3 }}***
                </span>
              </div>
            </div>
          </div>
        } @empty {
          <div class="text-center py-20">
            <div class="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-search text-gray-400 text-xl"></i>
            </div>
            <p class="text-gray-500 font-medium">No hay misiones activas en tu zona.</p>
            <p class="text-xs text-gray-400 mt-1">Te avisaremos cuando aparezca algo cerca.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class MissionsListPage implements OnInit {
  scout = inject(ScoutService);
  private alarm = inject(ScoutAlarmService);
  private router = inject(Router);

  ngOnInit() {
    this.scout.setupRealtimeListener();
    this.scout.getNearbyMissions(-34.6037, -58.3816);
  }

  async simulateAlert() {
    const mockMission: Bounty = {
      id: 'test-mission-id',
      car_id: 'test-car-id',
      reward_amount: 150,
      reward_currency: 'USD',
      status: 'OPEN',
      lat: -34.6037,
      lng: -58.3816,
      cars: {
        brand: 'Toyota',
        model: 'Corolla',
        color: 'Blanco',
        license_plate: 'AD 123 CD',
        photos: ['assets/placeholders/car-placeholder.png'],
        year: 2023
      }
    };

    const result = await this.alarm.triggerMissionAlert(mockMission);

    if (result?.accepted) {
      const targetId = this.scout.activeMissions()[0]?.id || 'test-id';
      this.router.navigate(['/scout/mission', targetId]);
    }
  }
}
