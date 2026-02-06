import { Component, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SupabaseService } from '@core/services/infrastructure/supabase.service';
import { ToastService } from '@core/services/ui/toast.service';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  paperPlaneOutline, 
  checkmarkCircleOutline, 
  carOutline, 
  personOutline, 
  mailOutline, 
  callOutline,
  locationOutline,
  helpCircleOutline
} from 'ionicons/icons';

interface TikTokWindow extends Window {
  ttq?: {
    track: (event: string, params: Record<string, unknown>) => void;
  };
}

@Component({
  selector: 'app-lead-capture-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonIcon],
  template: `
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl max-w-md mx-auto overflow-hidden relative">
      <!-- Decorative background blur -->
      <div class="absolute -top-24 -right-24 w-48 h-48 bg-ivory-500/10 rounded-full blur-3xl"></div>
      
      @if (!isSubmitted()) {
        <div class="relative z-10">
          <div class="mb-6">
            <h3 class="text-2xl font-black text-white mb-2 tracking-tight text-balance">Comienza a ganar en dólares</h3>
            <p class="text-zinc-400 text-sm">Déjanos tus datos y un asesor te ayudará con el alta de tu vehículo.</p>
          </div>

          <form [formGroup]="leadForm" (ngSubmit)="onSubmit()" class="space-y-4">
            <!-- Full Name -->
            <div class="space-y-1">
              <label class="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Nombre y Apellido</label>
              <div class="relative group">
                <ion-icon name="person-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-ivory-400 transition-colors"></ion-icon>
                <input 
                  type="text" 
                  formControlName="full_name"
                  placeholder="Juan Pérez"
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-ivory-500/50 focus:ring-1 focus:ring-ivory-500/20 transition-all"
                >
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Email -->
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Email</label>
                <div class="relative group">
                  <ion-icon name="mail-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-ivory-400 transition-colors"></ion-icon>
                  <input 
                    type="email" 
                    formControlName="email"
                    placeholder="juan@mail.com"
                    class="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-ivory-500/50 transition-all"
                  >
                </div>
              </div>

              <!-- Phone -->
              <div class="space-y-1">
                <label class="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">WhatsApp</label>
                <div class="relative group">
                  <ion-icon name="call-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-ivory-400 transition-colors"></ion-icon>
                  <input 
                    type="tel" 
                    formControlName="phone"
                    placeholder="+54 9 ..."
                    class="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-ivory-500/50 transition-all"
                  >
                </div>
              </div>
            </div>

            <!-- City -->
            <div class="space-y-1">
              <label class="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Ciudad</label>
              <div class="relative group">
                <ion-icon name="location-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-ivory-400 transition-colors"></ion-icon>
                <input 
                  type="text" 
                  formControlName="city"
                  placeholder="Ej: Buenos Aires, Córdoba..."
                  class="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:border-ivory-500/50 transition-all"
                >
              </div>
            </div>

            <!-- Has Car Toggle -->
            <div class="pt-2">
              <label class="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 ml-1">¿Tenés auto propio?</label>
              <div class="flex gap-3">
                <button 
                  type="button"
                  (click)="leadForm.get('has_car')?.setValue(true)"
                  [class]="leadForm.get('has_car')?.value === true ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-400 border-zinc-800'"
                  class="flex-1 py-3 px-4 rounded-xl border font-bold text-sm transition-all active:scale-95"
                >
                  Sí, tengo
                </button>
                <button 
                  type="button"
                  (click)="leadForm.get('has_car')?.setValue(false)"
                  [class]="leadForm.get('has_car')?.value === false ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-400 border-zinc-800'"
                  class="flex-1 py-3 px-4 rounded-xl border font-bold text-sm transition-all active:scale-95"
                >
                  No por ahora
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              [disabled]="leadForm.invalid || isSubmitting()"
              class="w-full bg-white text-black font-black py-4 rounded-xl flex items-center justify-center space-x-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 mt-8 shadow-lg shadow-white/5"
            >
              @if (isSubmitting()) {
                <div class="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Enviando...</span>
              } @else {
                <ion-icon name="paper-plane-outline" class="text-lg"></ion-icon>
                <span>Solicitar asesoramiento</span>
              }
            </button>
            
            <p class="text-[9px] text-center text-zinc-600 px-4">
              Al enviar, aceptas que AutoRenta te contacte para fines comerciales. 
              Tus datos están protegidos por nuestra política de privacidad.
            </p>
          </form>
        </div>
      } @else {
        <div class="text-center py-12 px-4 animate-fade-in relative z-10">
          <div class="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <ion-icon name="checkmark-circle-outline" class="text-5xl text-green-500"></ion-icon>
          </div>
          <h3 class="text-2xl font-black text-white mb-2">¡Solicitud recibida!</h3>
          <p class="text-zinc-400 mb-8 leading-relaxed">Un experto de AutoRenta te contactará por WhatsApp para ayudarte a ganar dinero con tu auto.</p>
          <button (click)="resetForm()" class="px-6 py-2 rounded-full border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all text-xs font-bold uppercase tracking-widest">Enviar otra consulta</button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class LeadCaptureFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly supabase = inject(SupabaseClientService);
  private readonly toast = inject(ToastService);

  @Input() carContext: { brand?: string | null, model?: string | null, year?: number | null } | null = null;

  readonly isSubmitting = signal(false);
  readonly isSubmitted = signal(false);

  readonly leadForm: FormGroup = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    city: ['', [Validators.required]],
    has_car: [true, [Validators.required]]
  });

  constructor() {
    addIcons({ 
      paperPlaneOutline, 
      checkmarkCircleOutline, 
      carOutline, 
      personOutline, 
      mailOutline, 
      callOutline,
      locationOutline,
      helpCircleOutline
    });
  }

  async onSubmit() {
    if (this.leadForm.invalid) return;

    this.isSubmitting.set(true);
    const rawData = this.leadForm.value;

    try {
      const { error } = await this.supabase.client
        .from('marketing_leads')
        .insert({
          platform: 'web_landing',
          lead_type: 'web_form',
          full_name: rawData.full_name,
          email: rawData.email,
          phone: rawData.phone,
          city: rawData.city,
          has_car: rawData.has_car,
          car_brand: this.carContext?.brand || null,
          car_model: this.carContext?.model || null,
          car_year: this.carContext?.year || null,
          metadata: { 
            url: window.location.href,
            user_agent: navigator.userAgent,
            referrer: document.referrer,
            is_mobile: /iPhone|Android/i.test(navigator.userAgent)
          }
        });

      if (error) throw error;

      // 🎯 TikTok Pixel Tracking
      const win = window as unknown as TikTokWindow;
      if (win.ttq) {
        win.ttq.track('CompleteRegistration', {
          content_name: 'Owner Lead',
          value: 0,
          currency: 'USD'
        });
      }

      this.isSubmitted.set(true);
      this.toast.success('¡Recibido!', 'Te contactaremos pronto por WhatsApp.');
    } catch (error) {
      console.error('Error saving lead:', error);
      this.toast.error('Error', 'Hubo un problema. Por favor reintenta.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm() {
    this.isSubmitted.set(false);
    this.leadForm.reset({ has_car: true });
  }
}

