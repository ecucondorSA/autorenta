import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisputeTimelineEvent } from '@core/services/admin/disputes.service';

@Component({
  selector: 'app-dispute-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wider">Historial del Expediente</h3>
      
      <div class="relative pl-6 border-l-2 border-border-default space-y-8">
        @for (event of events; track event.id) {
          <div class="relative">
            <!-- Icon -->
            <div class="absolute -left-[33px] top-0 h-4 w-4 rounded-full border-2 border-white"
              [ngClass]="{
                'bg-blue-500': event.event_type === 'status_change',
                'bg-green-500': event.event_type === 'resolution',
                'bg-amber-500': event.event_type === 'evidence_added',
                'bg-slate-400': event.event_type === 'comment'
              }"></div>
            
            <div class="flex flex-col">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-text-primary">{{ event.event_type | titlecase }}</span>
                <span class="text-[10px] text-text-muted">{{ event.created_at | date:'short' }}</span>
              </div>
              
              @if (event.body) {
                <div class="p-3 bg-surface-secondary rounded-xl text-sm text-text-secondary">
                  {{ event.body }}
                </div>
              }

              @if (event.from_status && event.to_status) {
                <div class="text-xs text-text-muted mt-1">
                  Estado: <span class="font-medium">{{ event.from_status }}</span> → <span class="font-medium text-text-primary">{{ event.to_status }}</span>
                </div>
              }
            </div>
          </div>
        } @empty {
          <p class="text-sm text-text-muted italic">No hay eventos registrados.</p>
        }
      </div>
    </div>
  `
})
export class DisputeTimelineComponent {
  @Input() events: DisputeTimelineEvent[] = [];
}
