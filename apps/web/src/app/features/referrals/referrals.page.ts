import {Component, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReferralsService } from '@core/services/auth/referrals.service';
import { MEDIUM_TIMEOUT_MS } from '@core/constants/timing.constants';

@Component({
  selector: 'app-referrals',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './referrals.page.html',
})
export class ReferralsPage implements OnInit {
  private readonly router = inject(Router);
  private readonly referralsService = inject(ReferralsService);

  readonly loading = signal(false);
  readonly copied = signal(false);
  readonly copiedLink = signal(false);
  readonly referralCode = this.referralsService.myReferralCode;
  readonly stats = this.referralsService.myStats;
  readonly shareableLink = this.referralsService.shareableLink;

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.referralsService.loadAllData();
    } finally {
      this.loading.set(false);
    }
  }

  async copyCode(): Promise<void> {
    const code = this.referralCode()?.code;
    if (code) {
      await navigator.clipboard.writeText(code);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), MEDIUM_TIMEOUT_MS);
    }
  }

  async copyLink(): Promise<void> {
    const link = this.shareableLink();
    if (link) {
      await navigator.clipboard.writeText(link);
      this.copiedLink.set(true);
      setTimeout(() => this.copiedLink.set(false), MEDIUM_TIMEOUT_MS);
    }
  }
}
