import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { TranslateModule } from '@ngx-translate/core';
import { PwaService } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './pwa-install-prompt.component.html',
  styleUrl: './pwa-install-prompt.component.css',
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(100%)', opacity: 0 })),
      ]),
    ]),
  ],
})
export class PwaInstallPromptComponent {
  readonly visible = signal(false);
  readonly installing = signal(false);

  constructor(private pwaService: PwaService) {
    // Show prompt after 30 seconds if installable
    setTimeout(() => {
      if (this.pwaService.installable() && !this.pwaService.isStandalone()) {
        this.visible.set(true);
      }
    }, 30000);
  }

  async install(): Promise<void> {
    this.installing.set(true);

    const accepted = await this.pwaService.promptInstall();

    if (accepted) {
      this.visible.set(false);
    }

    this.installing.set(false);
  }

  dismiss(): void {
    this.visible.set(false);
    // Don't show again for 7 days
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
  }
}
