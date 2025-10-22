import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './terms.page.html',
  styleUrls: ['./terms.page.css'],
})
export class TermsPage {}
