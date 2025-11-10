import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SmartOnboardingComponent } from '../../shared/components/smart-onboarding/smart-onboarding.component';

@Component({
  standalone: true,
  selector: 'app-onboarding-page',
  imports: [CommonModule, SmartOnboardingComponent],
  template: `
    <app-smart-onboarding (completed)="onOnboardingCompleted($event)"></app-smart-onboarding>
  `,
})
export class OnboardingPage {
  private readonly router = inject(Router);

  onOnboardingCompleted(data: unknown) {
    console.log('🎉 Onboarding completed:', data);

    // El componente ya maneja la redirección automática
    // Solo necesitamos hacer logging para analytics
  }
}
