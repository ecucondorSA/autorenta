import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs/operators';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { BankAccount, PayoutService } from '@core/services/payments/payout.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { WalletService } from '@core/services/payments/wallet.service';
import { MercadoPagoConnectComponent } from '../profile/mercadopago-connect.component';
import { BankAccountsComponent } from './components/bank-accounts.component';
import { PayoutHistoryComponent } from './components/payout-history.component';
import { RequestPayoutModalComponent } from './components/request-payout-modal.component';

/**
 * Payouts Page
 *
 * Allows owners to:
 * - View payout statistics
 * - Manage bank accounts (CBU/CVU)
 * - Request payouts from wallet
 * - View payout history
 */
@Component({
  selector: 'app-payouts-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    BankAccountsComponent,
    PayoutHistoryComponent,
    RequestPayoutModalComponent,
    MercadoPagoConnectComponent,
  ],
  templateUrl: './payouts.page.html',
  styleUrls: ['./payouts.page.css'],
})
export class PayoutsPage implements OnInit, OnDestroy {
  private readonly payoutService = inject(PayoutService);
  private readonly walletService = inject(WalletService);
  private readonly supabase = inject(SupabaseClientService).getClient();

  // Realtime channels
  private payoutsChannel: RealtimeChannel | null = null;
  private walletsChannel: RealtimeChannel | null = null;
  private bankAccountsChannel: RealtimeChannel | null = null;

  // State
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly userId = signal<string | null>(null);

  // Data
  readonly stats = signal<{
    totalPayouts: number;
    totalAmount: number;
    pendingPayouts: number;
    pendingAmount: number;
    completedPayouts: number;
    completedAmount: number;
    averagePayoutAmount: number;
  } | null>(null);

  readonly walletBalance = signal<number>(0);
  readonly defaultBankAccount = signal<BankAccount | null>(null);
  readonly showRequestModal = signal(false);

  // Computed
  readonly canRequestPayout = computed(() => {
    return this.walletBalance() >= 1000 && this.defaultBankAccount() !== null;
  });

  readonly formattedBalance = computed(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(this.walletBalance());
  });

  async ngOnInit(): Promise<void> {
    await this.loadData();
    this.setupRealtimeSubscription();
  }

  ngOnDestroy(): void {
    this.unsubscribeRealtime();
  }

  private setupRealtimeSubscription(): void {
    const userId = this.userId();
    if (!userId) return;

    // Limpiar suscripciones anteriores
    this.unsubscribeRealtime();

    // Suscribirse a cambios en payouts del usuario
    this.payoutsChannel = this.supabase
      .channel(`payouts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payouts',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void this.loadData();
        },
      )
      .subscribe();

    // Suscribirse a cambios en wallets del usuario
    this.walletsChannel = this.supabase
      .channel(`wallets:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void this.loadData();
        },
      )
      .subscribe();

    // Suscribirse a cambios en cuentas bancarias del usuario
    this.bankAccountsChannel = this.supabase
      .channel(`bank_accounts:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void this.loadData();
        },
      )
      .subscribe();
  }

  private unsubscribeRealtime(): void {
    if (this.payoutsChannel) {
      this.supabase.removeChannel(this.payoutsChannel);
      this.payoutsChannel = null;
    }
    if (this.walletsChannel) {
      this.supabase.removeChannel(this.walletsChannel);
      this.walletsChannel = null;
    }
    if (this.bankAccountsChannel) {
      this.supabase.removeChannel(this.bankAccountsChannel);
      this.bankAccountsChannel = null;
    }
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Get current user
      const user = await this.supabase.auth.getUser();

      if (!user.data.user) {
        throw new Error('Usuario no autenticado');
      }

      this.userId.set(user.data.user.id);

      // Load wallet balance
      const wallet = await this.walletService.getBalance().pipe(take(1)).toPromise();

      if (wallet) {
        this.walletBalance.set(wallet.available_balance);
      }

      // Load payout stats
      const stats = await this.payoutService
        .getPayoutStats(user.data.user.id)
        .pipe(take(1))
        .toPromise();

      if (stats) {
        this.stats.set(stats);
      }

      // Load default bank account
      const bankAccount = await this.payoutService
        .getDefaultBankAccount(user.data.user.id)
        .pipe(take(1))
        .toPromise();

      this.defaultBankAccount.set(bankAccount || null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      this.loading.set(false);
    }
  }

  openRequestModal(): void {
    this.showRequestModal.set(true);
  }

  closeRequestModal(): void {
    this.showRequestModal.set(false);
  }

  async onPayoutRequested(): Promise<void> {
    this.closeRequestModal();
    await this.loadData(); // Reload data
  }

  async onBankAccountUpdated(): Promise<void> {
    await this.loadData(); // Reload data
  }
}
