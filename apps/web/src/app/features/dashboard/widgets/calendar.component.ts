import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-calendar-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="p-4 bg-white rounded shadow">
      <h2 class="text-lg font-medium mb-2">Calendario</h2>
      <div class="text-sm text-gray-500 mb-2">Vista rápida de reservas y bloqueos</div>
      <div class="h-60 border rounded flex items-center justify-center text-gray-400">
        [Calendario placeholder]
      </div>
    </section>
  `,
})
export class CalendarWidgetComponent {}
