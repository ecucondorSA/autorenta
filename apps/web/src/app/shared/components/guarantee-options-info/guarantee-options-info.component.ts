import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guarantee-options-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guarantee-options-info.component.html',
})
export class GuaranteeOptionsInfoComponent {
  @Input() protectedCreditStatus: 'pending' | 'partial' | 'active' = 'pending';
  @Input() protectedCreditBalance = 0;
  @Input() protectedCreditTarget = 0;
  @Input() protectedCreditProgress = 0;
  @Output() openDepositModal = new EventEmitter<void>();
}
