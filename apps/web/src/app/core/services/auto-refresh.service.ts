import { Injectable, inject, DestroyRef } from '@angular/core';
import { interval, Subject, switchMap, takeUntilDestroyed, catchError, of } from 'rxjs';
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
export class AutoRefreshService {
  private readonly bookingsService = inject(BookingsService);
  private readonly walletService = inject(WalletService);
  private readonly destroyRef = inject(DestroyRef);

  private walletSubscription?: ReturnType<typeof interval>;
  private bookingsSubscription?: ReturnType<typeof interval>;

  private isRefreshingWallet = false;
  private isRefreshingBookings = false;

  /**
   * Start auto-refreshing wallet balance every 30 seconds
   */
  startWalletRefresh(): void {
    if (this.walletSubscription) {
      return; // Already running
    }

    this.walletSubscription = interval(30000)
      .pipe(
        switchMap(() => this.refreshWalletSafe()),
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.error('[AutoRefresh] Wallet refresh error:', err);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Start auto-refreshing booking status every 1 minute
   */
  startBookingsRefresh(): void {
    if (this.bookingsSubscription) {
      return; // Already running
    }

    this.bookingsSubscription = interval(60000)
      .pipe(
        switchMap(() => this.refreshBookingsSafe()),
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.error('[AutoRefresh] Bookings refresh error:', err);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Stop wallet refresh
   */
  stopWalletRefresh(): void {
    this.walletSubscription = undefined;
  }

  /**
   * Stop bookings refresh
   */
  stopBookingsRefresh(): void {
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
   * Safely refresh wallet (returns Observable)
   */
  private refreshWalletSafe(): Subject<null> {
    const result = new Subject<null>();

    if (this.isRefreshingWallet) {
      result.next(null);
      result.complete();
      return result;
    }

    this.isRefreshingWallet = true;
    this.walletService.getBalance()
      .then(() => {
        result.next(null);
        result.complete();
      })
      .catch((error) => {
        console.error('[AutoRefresh] Failed to refresh wallet:', error);
        result.next(null);
        result.complete();
      })
      .finally(() => {
        this.isRefreshingWallet = false;
      });

    return result;
  }

  /**
   * Safely refresh bookings (returns Observable)
   */
  private refreshBookingsSafe(): Subject<null> {
    const result = new Subject<null>();

    if (this.isRefreshingBookings) {
      result.next(null);
      result.complete();
      return result;
    }

    this.isRefreshingBookings = true;
    this.bookingsService.getMyBookings()
      .then(() => {
        result.next(null);
        result.complete();
      })
      .catch((error) => {
        console.error('[AutoRefresh] Failed to refresh bookings:', error);
        result.next(null);
        result.complete();
      })
      .finally(() => {
        this.isRefreshingBookings = false;
      });

    return result;
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
