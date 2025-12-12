import { CommonModule } from '@angular/common';
import {Component, inject,
  ChangeDetectionStrategy} from '@angular/core';
import { Router } from '@angular/router';
import { SmartOnboardingComponent } from '../../shared/components/smart-onboarding/smart-onboarding.component';

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
