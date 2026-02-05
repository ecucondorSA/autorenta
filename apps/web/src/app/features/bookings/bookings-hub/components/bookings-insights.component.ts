import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { InsightItem } from '../bookings-hub.types';

@Component({
  selector: 'app-bookings-insights',
  standalone: true,
  imports: [CommonModule, IonIcon, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-4">
      <div class="flex items-center justify-between px-1">
        <h2 class="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
          <ion-icon name="grid-outline" class="text-indigo-500"></ion-icon>
          Indicadores
        </h2>
        <span class="text-[10px] font-bold text-text-muted italic">Últimos 30 días</span>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        @for (item of items(); track item.id) {
          <div class="bg-surface-secondary/50 rounded-3xl p-5 border border-border-muted hover:bg-white hover:shadow-premium-md transition-all duration-300 group">
            <div class="flex flex-col h-full justify-between gap-4">
              <div class="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-text-muted group-hover:text-cta-default shadow-sm transition-colors">
                <ion-icon [name]="item.icon"></ion-icon>
              </div>
              <div>
                <p class="text-[10px] font-black uppercase tracking-widest text-text-muted mb-1">{{ item.label }}</p>
                <div class="text-2xl font-black text-text-primary font-mono tracking-tighter">
                  @if (item.type === 'money') {
                    {{ $any(item.value) | money }}
                  } @else {
                    {{ item.value }}
                  }
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </section>
  `
})
export class BookingsInsightsComponent {
  items = input.required<InsightItem[]>();
}
