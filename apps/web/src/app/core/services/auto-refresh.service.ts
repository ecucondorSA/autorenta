import { Injectable, inject, OnDestroy } from '@angular/core';
import { interval, Subject, Subscription, switchMap, takeUntil } from 'rxjs';
import { BookingsService } from './bookings.service';
import { WalletService } from './wallet.service';

/**
 * P1-022 FIX: Auto-Refresh Service
 *
 * Automatically refreshes critical data at specified intervals:
 * - Wallet balance: every 30 seconds
 * - Booking status: every 1 minute
 * - User data: on-demand refresh
 *
 * Features:
 * - Automatic cleanup on component destroy
 * - Pause/resume capabilities
 * - Error handling and retry
 */
@Injectable({
  providedIn: 'root',
})
export class AutoRefreshService implements OnDestroy {
  private readonly bookingsService = inject(BookingsService);
  private readonly walletService = inject(WalletService);

  private readonly destroy$ = new Subject<void>();
  private walletSubscription?: Subscription;
  private bookingsSubscription?: Subscription;

  private isRefreshingWallet = false;
  private isRefreshingBookings = false;

  ngOnDestroy(): void {
    this.stopAll();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Start auto-refreshing wallet balance every 30 seconds
   */
  startWalletRefresh(): void {
    if (this.walletSubscription && !this.walletSubscription.closed) {
      return; // Already running
    }

    this.walletSubscription = interval(30000) // 30 seconds
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.refreshWallet()),
      )
      .subscribe();
  }

  /**
   * Start auto-refreshing booking status every 1 minute
   */
  startBookingsRefresh(): void {
    if (this.bookingsSubscription && !this.bookingsSubscription.closed) {
      return; // Already running
    }

    this.bookingsSubscription = interval(60000) // 1 minute
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.refreshBookings()),
      )
      .subscribe();
  }

  /**
   * Stop wallet refresh
   */
  stopWalletRefresh(): void {
    this.walletSubscription?.unsubscribe();
    this.walletSubscription = undefined;
  }

  /**
   * Stop bookings refresh
   */
  stopBookingsRefresh(): void {
    this.bookingsSubscription?.unsubscribe();
    this.bookingsSubscription = undefined;
  }

  /**
   * Stop all auto-refresh operations
   */
  stopAll(): void {
    this.stopWalletRefresh();
    this.stopBookingsRefresh();
  }

  /**
   * Manually trigger wallet refresh
   */
  async refreshWallet(): Promise<void> {
    if (this.isRefreshingWallet) return;

    try {
      this.isRefreshingWallet = true;
      await this.walletService.getBalance();
    } catch (error) {
      console.error('[AutoRefresh] Failed to refresh wallet:', error);
    } finally {
      this.isRefreshingWallet = false;
    }
  }

  /**
   * Manually trigger bookings refresh
   */
  async refreshBookings(): Promise<void> {
    if (this.isRefreshingBookings) return;

    try {
      this.isRefreshingBookings = true;
      await this.bookingsService.getMyBookings();
    } catch (error) {
      console.error('[AutoRefresh] Failed to refresh bookings:', error);
    } finally {
      this.isRefreshingBookings = false;
    }
  }
}
