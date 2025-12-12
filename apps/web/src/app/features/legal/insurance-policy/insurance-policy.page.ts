import { CommonModule } from '@angular/common';
import {Component,
  ChangeDetectionStrategy} from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-insurance-policy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink],
  templateUrl: './insurance-policy.page.html',
  styleUrls: ['../legal-shared.css'],
})
export class InsurancePolicyPage {}
