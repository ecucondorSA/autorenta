import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FabAction {
  id: string;
  label: string;
  icon: string;
  color?: 'primary' | 'secondary' | 'accent';
}

@Component({
  selector: 'app-floating-action-fab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-action-fab.component.html',
  styleUrls: ['./floating-action-fab.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingActionFabComponent {
  @Input() actions: FabAction[] = [];
  @Input() position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' = 'bottom-right';

  @Output() actionClick = new EventEmitter<string>();

  readonly expanded = signal(false);

  readonly positionClass = computed(() => {
    const positions = {
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
    };
    return positions[this.position];
  });

  toggleExpanded(): void {
    this.expanded.set(!this.expanded());
  }

  onActionClick(actionId: string): void {
    this.actionClick.emit(actionId);
    this.expanded.set(false);
  }

  getActionColorClass(action: FabAction): string {
    const colors = {
      primary: 'bg-cta-default text-cta-text',
      secondary: 'bg-charcoal-medium hover:bg-charcoal-dark text-text-inverse',
      accent: 'bg-warning-light hover:bg-warning-light/90 text-text-inverse',
    };
    return colors[action.color || 'primary'];
  }
}



