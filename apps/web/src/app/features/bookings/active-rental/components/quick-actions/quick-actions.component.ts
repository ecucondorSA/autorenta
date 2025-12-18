import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-quick-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './quick-actions.component.html',
})
export class QuickActionsComponent {
  @Input() ownerPhone: string | null = null;
  @Input() hasLocation = false;
  @Output() action = new EventEmitter<string>();

  get actions(): QuickAction[] {
    return [
      {
        id: 'locate',
        label: 'Localizar Auto',
        icon: 'location',
        color: 'bg-blue-500',
        disabled: false, // Always available, will show fallback
      },
      {
        id: 'gas',
        label: 'Estaciones',
        icon: 'fuel',
        color: 'bg-green-500',
      },
      {
        id: 'call',
        label: 'Llamar',
        icon: 'phone',
        color: 'bg-purple-500',
        disabled: !this.ownerPhone,
      },
      {
        id: 'sos',
        label: 'SOS',
        icon: 'alert',
        color: 'bg-red-500',
      },
    ];
  }

  onAction(actionId: string): void {
    this.action.emit(actionId);
  }
}
