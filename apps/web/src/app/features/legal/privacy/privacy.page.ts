import { CommonModule } from '@angular/common';
import {Component,
  ChangeDetectionStrategy} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-privacy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslateModule],
  templateUrl: './privacy.page.html',
  styleUrls: ['../legal-shared.css'],
})
export class PrivacyPage {}
