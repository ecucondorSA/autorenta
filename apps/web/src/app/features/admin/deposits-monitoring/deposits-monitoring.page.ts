import {
  Component,
  computed,
  OnDestroy,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '@environment';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

interface DepositStats {
  total_deposits: number;
  completed: number;
  pending: number;
  failed: number;
  total_amount_completed: number;
  total_amount_pending: number;
  total_amount_failed: number;
  avg_confirmation_time_minutes?: number;
}

interface DepositTransaction {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  provider_transaction_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  time_to_complete_minutes?: number;
}

interface DatabaseTransactionRow {
  id: string;
  user_id: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  provider_transaction_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
}

@Component({
  selector: 'app-deposits-monitoring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './deposits-monitoring.page.html',
  styleUrls: ['./deposits-monitoring.page.css'],
})
export class DepositsMonitoringPage implements OnInit, OnDestroy {
  private pollInterval?: ReturnType<typeof setInterval>;
  // Signals
  readonly stats = signal<DepositStats>({
    total_deposits: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    total_amount_completed: 0,
    total_amount_pending: 0,
    total_amount_failed: 0,
  });

  readonly pendingDeposits = signal<DepositTransaction[]>([]);
  readonly recentDeposits = signal<DepositTransaction[]>([]);
  readonly failedDeposits = signal<DepositTransaction[]>([]);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedTab = signal<'pending' | 'recent' | 'failed'>('pending');

  // Computed
  readonly successRate = computed(() => {
    const s = this.stats();
    const total = s.total_deposits;
    if (total === 0) return 0;
    return ((s.completed / total) * 100).toFixed(1);
  });

  readonly failureRate = computed(() => {
    const s = this.stats();
    const total = s.total_deposits;
    if (total === 0) return 0;
    return ((s.failed / total) * 100).toFixed(1);
  });

  constructor(
    private supabase: SupabaseClientService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadData();

    // Auto-refresh cada 30 segundos
    // Auto-refresh cada 30 segundos
    this.pollInterval = setInterval(() => {
      this.loadData();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      await Promise.all([
        this.loadStats(),
        this.loadPendingDeposits(),
        this.loadRecentDeposits(),
        this.loadFailedDeposits(),
      ]);
    } catch {
      this.error.set('Error al cargar datos del dashboard');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadStats(): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('wallet_transactions')
      .select('status, amount, created_at, completed_at')
      .eq('type', 'deposit');

    if (error) throw error;

    const transactions = data || [];

    const stats: DepositStats = {
      total_deposits: transactions.length,
      completed: transactions.filter((t) => t.status === 'completed').length,
      pending: transactions.filter((t) => t.status === 'pending').length,
      failed: transactions.filter((t) => t.status === 'failed').length,
      total_amount_completed: transactions
        .filter((t) => t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0),
      total_amount_pending: transactions
        .filter((t) => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0),
      total_amount_failed: transactions
        .filter((t) => t.status === 'failed')
        .reduce((sum, t) => sum + t.amount, 0),
    };

    // Calculate average confirmation time
    const completedWithTimes = transactions.filter(
      (t) => t.status === 'completed' && t.created_at && t.completed_at,
    );

    if (completedWithTimes.length > 0) {
      const totalMinutes = completedWithTimes.reduce((sum, t) => {
        const created = new Date(t.created_at).getTime();
        const completed = new Date(t.completed_at!).getTime();
        return sum + (completed - created) / 60000;
      }, 0);

      stats.avg_confirmation_time_minutes = totalMinutes / completedWithTimes.length;
    }

    this.stats.set(stats);
  }

  private async loadPendingDeposits(): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('wallet_transactions')
      .select('*, profiles!wallet_transactions_user_id_fkey(first_name, last_name)')
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const deposits: DepositTransaction[] = ((data as DatabaseTransactionRow[]) || []).map((t) => {
      const profile = t.profiles;
      return {
        id: t.id,
        user_id: t.user_id,
        user_name: profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : undefined,
        status: t.status,
        amount: t.amount,
        currency: t.currency,
        provider: t.provider,
        provider_transaction_id: t.provider_transaction_id,
        created_at: t.created_at,
        updated_at: t.updated_at,
        completed_at: t.completed_at,
      };
    });

    this.pendingDeposits.set(deposits);
  }

  private async loadRecentDeposits(): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('wallet_transactions')
      .select('*, profiles!wallet_transactions_user_id_fkey(first_name, last_name)')
      .eq('type', 'deposit')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const deposits: DepositTransaction[] = ((data as DatabaseTransactionRow[]) || []).map((t) => {
      const profile = t.profiles;
      const created = new Date(t.created_at).getTime();
      const completed = t.completed_at ? new Date(t.completed_at).getTime() : null;

      return {
        id: t.id,
        user_id: t.user_id,
        user_name: profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : undefined,
        status: t.status,
        amount: t.amount,
        currency: t.currency,
        provider: t.provider,
        provider_transaction_id: t.provider_transaction_id,
        created_at: t.created_at,
        updated_at: t.updated_at,
        completed_at: t.completed_at,
        time_to_complete_minutes: completed ? (completed - created) / 60000 : undefined,
      };
    });

    this.recentDeposits.set(deposits);
  }

  private async loadFailedDeposits(): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('wallet_transactions')
      .select('*, profiles!wallet_transactions_user_id_fkey(first_name, last_name)')
      .eq('type', 'deposit')
      .eq('status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const deposits: DepositTransaction[] = ((data as DatabaseTransactionRow[]) || []).map((t) => {
      const profile = t.profiles;
      return {
        id: t.id,
        user_id: t.user_id,
        user_name: profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : undefined,
        status: t.status,
        amount: t.amount,
        currency: t.currency,
        provider: t.provider,
        provider_transaction_id: t.provider_transaction_id,
        created_at: t.created_at,
        updated_at: t.updated_at,
      };
    });

    this.failedDeposits.set(deposits);
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'USD',
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Hace unos segundos';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${days} días`;
  }

  formatDuration(minutes: number): string {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.floor(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  }

  async retryPendingPayments(): Promise<void> {
    if (confirm('¿Forzar verificación de todos los pagos pendientes?')) {
      try {
        this.loading.set(true);

        const {
          data: { session },
        } = await this.supabase.getClient().auth.getSession();
        const accessToken = session?.access_token;

        if (!accessToken) {
          alert('Error: No hay sesión activa');
          return;
        }

        const response = await fetch(
          `${environment.supabaseUrl}/functions/v1/mercadopago-poll-pending-payments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({}),
          },
        );

        if (!response.ok) {
          throw new Error('Error al ejecutar polling');
        }

        const result = await response.json();
        alert(`✅ Polling completado\n\nConfirmados: ${result.summary?.confirmed || 0}`);

        await this.loadData();
      } catch {
        alert('Error al ejecutar polling');
      } finally {
        this.loading.set(false);
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/admin']);
  }
}
