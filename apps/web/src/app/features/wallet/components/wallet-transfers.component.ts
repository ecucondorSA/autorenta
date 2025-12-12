import { CommonModule } from '@angular/common';
import {Component, OnInit, inject, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { WalletLedgerService } from '../../../core/services/wallet-ledger.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';

@Component({
  selector: 'app-wallet-transfers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    <div
      class="rounded-2xl border border-border-default dark:border-border-muted bg-surface-raised dark:bg-surface-secondary p-4 space-y-3"
    >
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-text-primary">Transferencias</h3>
          <p class="text-sm text-text-secondary">Enviadas y recibidas</p>
        </div>
        <ion-spinner *ngIf="loading()" name="crescent"></ion-spinner>
      </div>

      <div *ngIf="error()" class="text-sm text-error-strong">
        {{ error() }}
      </div>

      <div *ngIf="!loading() && !transfers().length" class="text-sm text-text-secondary">
        Aún no tienes transferencias.
      </div>

      <div class="space-y-3" *ngIf="transfers().length">
        <div
          *ngFor="let t of transfers()"
          class="flex items-center justify-between rounded-xl border border-border-default/60 dark:border-border-muted/60 p-3"
        >
          <div class="space-y-0.5">
            <p class="text-sm font-semibold text-text-primary">
              {{ directionLabel(t) }}
            </p>
            <p class="text-xs text-text-secondary">
              {{ t.created_at | date: 'short' }}
              <span class="mx-1">•</span>
              {{ t.status }}
            </p>
          </div>
          <div class="text-right">
            <p
              [ngClass]="
                t.from_user === currentUserId() ? 'text-error-strong' : 'text-success-strong'
              "
              class="font-semibold"
            >
              {{ amountLabel(t.amount_cents, t.from_user === currentUserId()) }}
            </p>
            <p class="text-xs text-text-secondary">Ref: {{ t.ref }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class WalletTransfersComponent implements OnInit {
  private readonly ledger = inject(WalletLedgerService);
  private readonly supabase = inject(SupabaseClientService).getClient();

  readonly transfers = this.ledger.transfers;
  readonly loading = this.ledger.loading;
  readonly error = this.ledger.error;

  readonly currentUserId = signal<string | null>(null);

  ngOnInit(): void {
    void this.loadUserAndTransfers();
  }

  private async loadUserAndTransfers(): Promise<void> {
    const { data } = await this.supabase.auth.getUser();
    this.currentUserId.set(data.user?.id ?? null);
    await this.ledger.loadTransfers(30);
  }

  amountLabel(cents: number, outgoing: boolean): string {
    const amount = (cents / 100).toLocaleString('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    });
    return outgoing ? `- ${amount}` : `+ ${amount}`;
  }

  directionLabel(t: {
    from_user: string;
    to_user: string;
    from_user_name?: string;
    to_user_name?: string;
  }): string {
    const me = this.currentUserId();
    if (me && t.from_user === me) {
      return `Enviada a ${t.to_user_name || t.to_user || 'usuario'}`;
    }
    return `Recibida de ${t.from_user_name || t.from_user || 'usuario'}`;
  }
}
