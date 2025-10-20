import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../../core/services/pwa.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-pwa-update-prompt',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './pwa-update-prompt.component.html',
  styleUrl: './pwa-update-prompt.component.css',
})
export class PwaUpdatePromptComponent {
  constructor(public pwaService: PwaService) {}

  async update(): Promise<void> {
    await this.pwaService.activateUpdate();
  }

  dismiss(): void {
    this.pwaService.updateAvailable.set(false);
  }
}
