import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { BookingWizardData } from '../../pages/booking-wizard/booking-wizard.page';

interface InsuranceOption {
  level: 'basic' | 'standard' | 'premium';
  name: string;
  description: string;
  price: number; // per day
  coverage: number; // max coverage amount
  deductible: number;
  features: string[];
  recommended: boolean;
}

@Component({
  selector: 'app-booking-insurance-step',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './booking-insurance-step.component.html',
  styleUrls: ['./booking-insurance-step.component.scss'],
})
export class BookingInsuranceStepComponent implements OnInit {
  @Input() car: any;
  @Input() data: BookingWizardData | null = null;
  @Output() dataChange = new EventEmitter<Partial<BookingWizardData>>();

  selectedLevel = signal<'basic' | 'standard' | 'premium' | null>(null);

  insuranceOptions: InsuranceOption[] = [
    {
      level: 'basic',
      name: 'Básico',
      description: 'Cobertura esencial para daños al vehículo',
      price: 5,
      coverage: 500000,
      deductible: 50000,
      features: ['Daños por colisión', 'Daños a terceros', 'Robo del vehículo'],
      recommended: false,
    },
    {
      level: 'standard',
      name: 'Estándar',
      description: 'Cobertura completa con menor deducible',
      price: 10,
      coverage: 1000000,
      deductible: 20000,
      features: [
        'Todo lo incluido en Básico',
        'Asistencia en carretera 24/7',
        'Auto de reemplazo',
        'Cancelación flexible',
      ],
      recommended: true,
    },
    {
      level: 'premium',
      name: 'Premium',
      description: 'Máxima protección sin deducible',
      price: 15,
      coverage: 2000000,
      deductible: 0,
      features: [
        'Todo lo incluido en Estándar',
        'Sin deducible',
        'Cobertura internacional',
        'Protección de llantas y cristales',
        'Daños por fenómenos naturales',
      ],
      recommended: false,
    },
  ];

  ngOnInit() {
    if (this.data?.insuranceLevel) {
      this.selectedLevel.set(this.data.insuranceLevel);
    }
  }

  selectInsurance(level: 'basic' | 'standard' | 'premium') {
    this.selectedLevel.set(level);
    this.dataChange.emit({ insuranceLevel: level });
  }

  getSelectedOption(): InsuranceOption | undefined {
    return this.insuranceOptions.find((opt) => opt.level === this.selectedLevel());
  }
}
