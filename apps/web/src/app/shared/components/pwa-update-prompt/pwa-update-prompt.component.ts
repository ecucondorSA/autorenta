import {Component,
  ChangeDetectionStrategy} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import { PwaService } from '../../../core/services/pwa.service';

@Component({
  selector: 'app-pwa-update-prompt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
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
