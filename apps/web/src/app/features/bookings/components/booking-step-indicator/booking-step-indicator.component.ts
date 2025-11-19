import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface Step {
  number: number;
  label: string;
  icon: string;
  isActive: boolean;
  isCompleted: boolean;
  isClickable: boolean;
}

@Component({
  selector: 'app-booking-step-indicator',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './booking-step-indicator.component.html',
  styleUrls: ['./booking-step-indicator.component.scss']
})
export class BookingStepIndicatorComponent {
  @Input() currentStep: number = 1;
  @Input() totalSteps: number = 6;
  @Output() stepClick = new EventEmitter<number>();

  readonly stepLabels = [
    { label: 'Fechas', icon: 'calendar-outline' },
    { label: 'Seguro', icon: 'shield-checkmark-outline' },
    { label: 'Extras', icon: 'add-circle-outline' },
    { label: 'Conductor', icon: 'person-outline' },
    { label: 'Pago', icon: 'card-outline' },
    { label: 'Revisar', icon: 'checkmark-done-outline' },
  ];

  get steps(): Step[] {
    return this.stepLabels.map((step, index) => ({
      number: index + 1,
      label: step.label,
      icon: step.icon,
      isActive: this.currentStep === index + 1,
      isCompleted: this.currentStep > index + 1,
      isClickable: this.currentStep > index + 1, // Can only click on completed steps
    }));
  }

  get progressPercentage(): number {
    return ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
  }

  onStepClick(step: Step) {
    if (step.isClickable) {
      this.stepClick.emit(step.number);
    }
  }
}
