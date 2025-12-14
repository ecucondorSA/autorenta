
import {Component,
  ChangeDetectionStrategy} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-terms',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './terms.page.html',
  styleUrls: ['../legal-shared.css'],
})
export class TermsPage {}
