import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from, interval, of, Subscription, type Observable } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

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
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  private walletSubscription?: Subscription;
  private bookingsSubscription?: Subscription;

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
        catchError((err: unknown) => {
          this.logger.error('Wallet refresh error', err instanceof Error ? err.message : String(err));
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
        catchError((err: unknown) => {
          this.logger.error('Bookings refresh error', err instanceof Error ? err.message : String(err));
          return of(null);
        })
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
   * Safely refresh wallet (returns Observable)
   */
  private refreshWalletSafe(): Observable<null> {
    if (this.isRefreshingWallet) {
      return of(null);
    }

    this.isRefreshingWallet = true;
    return from(this.walletService.fetchBalance()).pipe(
      map(() => null),
      catchError((error: unknown) => {
        this.logger.error('Failed to refresh wallet', error instanceof Error ? error.message : String(error));
        return of(null);
      }),
      finalize(() => {
        this.isRefreshingWallet = false;
      }),
    );
  }

  /**
   * Safely refresh bookings (returns Observable)
   */
  private refreshBookingsSafe(): Observable<null> {
    if (this.isRefreshingBookings) {
      return of(null);
    }

    this.isRefreshingBookings = true;
    return from(this.bookingsService.getMyBookings()).pipe(
      map(() => null),
      catchError((error: unknown) => {
        this.logger.error('Failed to refresh bookings', error instanceof Error ? error.message : String(error));
        return of(null);
      }),
      finalize(() => {
        this.isRefreshingBookings = false;
      }),
    );
  }

  /**
   * Manually trigger wallet refresh
   */
  async refreshWallet(): Promise<void> {
    if (this.isRefreshingWallet) return;

    try {
      this.isRefreshingWallet = true;
      await this.walletService.fetchBalance(true);
    } catch (error) {
      this.logger.error('Failed to refresh wallet', error instanceof Error ? error.message : String(error));
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
      this.logger.error('Failed to refresh bookings', error instanceof Error ? error.message : String(error));
    } finally {
      this.isRefreshingBookings = false;
    }
  }
}
