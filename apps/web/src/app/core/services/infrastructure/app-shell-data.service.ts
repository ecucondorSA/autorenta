import { Injectable, inject, signal } from '@angular/core';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { AuthService } from '@core/services/auth/auth.service';

/**
 * Lightweight service for app shell data needs.
 *
 * Replaces eager imports of BookingsStore + BookingApprovalService in AppComponent.
 * Those services pull ~200KB of transitive dependencies (15 booking-* services,
 * wallet, cars, insurance, etc.) into the initial bundle.
 *
 * This service does the same 2 queries directly:
 * 1. hasActiveTrip — for SOS button visibility
 * 2. pendingApprovalCount — for owner badge in menu
 */
@Injectable({ providedIn: 'root' })
export class AppShellDataService {
  private readonly supabase = injectSupabase();
  private readonly authService = inject(AuthService);

  readonly hasActiveTrip = signal(false);
  readonly pendingApprovalCount = signal(0);

  async loadShellData(): Promise<void> {
    const userId = await this.authService.getCachedUserId();
    if (!userId) return;

    // Fire both queries in parallel
    const [tripResult, approvalResult] = await Promise.all([
      this.supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
        .eq('status', 'in_progress'),
      this.supabase
        .from('owner_pending_approvals')
        .select('id', { count: 'exact', head: true }),
    ]);

    this.hasActiveTrip.set((tripResult.count ?? 0) > 0);
    this.pendingApprovalCount.set(approvalResult.count ?? 0);
  }
}
