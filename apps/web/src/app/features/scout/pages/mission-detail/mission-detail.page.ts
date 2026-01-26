import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { ScoutService, Bounty } from '../../services/scout.service';

@Component({
  selector: 'app-mission-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gray-900 text-white">
      <!-- TOP NAV -->
      <div class="p-4 flex items-center gap-4">
        <button routerLink="/scout" class="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
          <i class="fas fa-arrow-left"></i>
        </button>
        <h2 class="font-bold">Detalle de Misión</h2>
      </div>

      <!-- CAR INFO CARD -->
      <div class="px-4 mt-2">
        <div class="bg-gray-800 rounded-3xl overflow-hidden border border-gray-700">
          <div class="h-48 bg-gray-700 relative">
            <img [src]="mission()?.cars?.photos?.[0]" class="w-full h-full object-cover">
            <div class="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full font-black text-sm shadow-lg">
              RECOMPENSA: $150
            </div>
          </div>
          <div class="p-6">
            <div class="flex justify-between items-end">
              <div>
                <h1 class="text-2xl font-bold">{{ mission()?.cars?.brand }} {{ mission()?.cars?.model }}</h1>
                <p class="text-gray-400">{{ mission()?.cars?.color }} • {{ mission()?.cars?.year }}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Patente Parcial</p>
                <p class="text-xl font-mono font-bold text-indigo-400">{{ mission()?.cars?.license_plate | slice:0:3 }} XXX</p>
              </div>
            </div>
            
            <div class="mt-6 grid grid-cols-2 gap-4">
              <div class="bg-gray-900 p-3 rounded-2xl border border-gray-700">
                <p class="text-[10px] text-gray-500 uppercase font-bold">Última Señal</p>
                <p class="text-sm font-medium">Hace 12 min</p>
              </div>
              <div class="bg-gray-900 p-3 rounded-2xl border border-gray-700">
                <p class="text-[10px] text-gray-500 uppercase font-bold">Zona</p>
                <p class="text-sm font-medium">Radio 500m</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- INSTRUCTIONS -->
      <div class="p-6 space-y-4">
        <h3 class="font-bold text-indigo-400 uppercase text-xs tracking-widest">Instrucciones de Seguridad</h3>
        <div class="space-y-3">
          <div class="flex gap-3 items-start">
            <div class="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">1</div>
            <p class="text-sm text-gray-300">Mantén al menos 10 metros de distancia del vehículo.</p>
          </div>
          <div class="flex gap-3 items-start">
            <div class="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">2</div>
            <p class="text-sm text-gray-300">Asegúrate de que la **patente sea legible** en la foto.</p>
          </div>
          <div class="flex gap-3 items-start">
            <div class="w-6 h-6 bg-red-500/20 text-red-400 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">!</div>
            <p class="text-sm text-red-200 font-bold">NO interactúes con el conductor bajo ninguna circunstancia.</p>
          </div>
        </div>
      </div>

      <!-- ACTION BUTTON -->
      <div class="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent">
        <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" capture="environment" class="hidden">
        
        <button (click)="fileInput.click()" 
                [disabled]="isUploading()"
                class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 h-16 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95">
          <i *ngIf="!isUploading()" class="fas fa-camera text-2xl"></i>
          <span *ngIf="!isUploading()">CONFIRMAR HALLAZGO</span>
          <span *ngIf="isUploading()">VERIFICANDO...</span>
          <div *ngIf="isUploading()" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </button>
      </div>
    </div>
  `
})
export class MissionDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private scoutService = inject(ScoutService);

  mission = signal<Bounty | null>(null);
  isUploading = signal(false);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      // Por simplicidad, buscamos en el signal local
      const m = this.scoutService.activeMissions().find(b => b.id === id);
      if (m) {
        this.mission.set(m);
      } else {
        // En un caso real, cargaríamos de la API
      }
    }
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file || !this.mission()) return;

    this.isUploading.set(true);
    try {
      // Mock de GPS (debería venir del plugin de Geolocation)
      const lat = -34.6037; 
      const lng = -58.3816;

      await this.scoutService.submitClaim(this.mission()!.id, file, lat, lng);
      
      alert('✅ Foto enviada correctamente. La IA está verificando la patente. Te avisaremos si la recompensa es aprobada.');
      this.router.navigate(['/scout']);
    } catch (error: any) {
      alert('Error al subir la foto: ' + error.message);
    } finally {
      this.isUploading.set(false);
    }
  }
}
