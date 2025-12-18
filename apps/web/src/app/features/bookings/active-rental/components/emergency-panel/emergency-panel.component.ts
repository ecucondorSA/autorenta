import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  icon: string;
  color: string;
}

interface InsuranceInfo {
  policyNumber: string;
  provider: string;
  phone: string;
}

@Component({
  selector: 'app-emergency-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './emergency-panel.component.html',
})
export class EmergencyPanelComponent {
  @Input() ownerName = 'Propietario';
  @Input() ownerPhone: string | null = null;
  @Input() insuranceInfo: InsuranceInfo | null = null;
  @Output() close = new EventEmitter<void>();

  readonly emergencyContacts: EmergencyContact[] = [
    {
      id: 'police',
      name: 'Policía',
      phone: '911',
      icon: 'shield',
      color: 'bg-blue-600',
    },
    {
      id: 'ambulance',
      name: 'Ambulancia',
      phone: '107',
      icon: 'health',
      color: 'bg-red-600',
    },
    {
      id: 'tow',
      name: 'Grúa del Seguro',
      phone: '0800-333-RENT',
      icon: 'truck',
      color: 'bg-orange-600',
    },
    {
      id: 'autorentar',
      name: 'AutoRenta 24/7',
      phone: '+54 11 5555-1234',
      icon: 'support',
      color: 'bg-primary-600',
    },
  ];

  callNumber(phone: string): void {
    window.location.href = `tel:${phone}`;
  }

  callOwner(): void {
    if (this.ownerPhone) {
      window.location.href = `tel:${this.ownerPhone}`;
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
