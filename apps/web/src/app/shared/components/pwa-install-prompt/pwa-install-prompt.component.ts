import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-install-prompt.component.html',
  styleUrl: './pwa-install-prompt.component.css',
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
