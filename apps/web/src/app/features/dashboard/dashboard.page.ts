import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CalendarWidgetComponent } from './widgets/calendar.component';
import { PayoutsWidgetComponent } from './widgets/payouts.component';
import { StatisticsWidgetComponent } from './widgets/statistics.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    StatisticsWidgetComponent,
    CalendarWidgetComponent,
    PayoutsWidgetComponent,
  ],
  template: `
    <div class="p-4">
      <h1 class="text-2xl font-semibold mb-4">Dashboard — Locadores / Locatarios</h1>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="lg:col-span-2">
          <app-calendar-widget></app-calendar-widget>
        </div>
        <div class="lg:col-span-1 space-y-4">
          <app-statistics-widget></app-statistics-widget>
          <app-payouts-widget></app-payouts-widget>
        </div>
      </div>
    </div>
  `,
  styles: [``],
})
export class DashboardPage {}
