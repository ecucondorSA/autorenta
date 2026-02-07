import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WalletService } from '@core/services/payments/wallet.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { MoneyPipe } from '@shared/pipes/money.pipe';

type FinanceSectionId = 'wallet' | 'payouts' | 'earnings';
type FinanceActionId = 'deposit' | 'withdraw' | 'history' | 'earnings';

interface FinanceSection {
  id: FinanceSectionId;
  title: string;
  description: string;
  route: string;
  cta: string;
  helper: string;
  icon: string;
  badge?: string;
  classes: {
    card: string;
    iconBg: string;
    icon: string;
    badge: string;
    cta: string;
  };
}

interface FinanceAction {
  id: FinanceActionId;
  label: string;
  description: string;
  route: string;
  icon: string;
  classes: {
    card: string;
    iconBg: string;
    icon: string;
  };
}

const FINANCE_COPY = {
  kicker: 'Centro financiero',
  title: 'Finanzas',
  subtitle: 'Tu dinero, tus movimientos y tus ganancias, todo en un solo lugar.',
  notificationsLabel: 'Notificaciones',
  summaryTitle: 'Resumen de saldos',
  summaryAvailable: 'Disponible',
  summaryLocked: 'Bloqueado',
  summaryWithdrawable: 'Para retirar',
  quickActionsTitle: 'Acciones rápidas',
  quickActionsHint: 'Operaciones frecuentes',
  quickActionsCta: 'Ir',
  historyLink: 'Ver movimientos',
  sectionsTitle: 'Secciones principales',
  walletErrorTitle: 'No pudimos cargar tu saldo',
  walletErrorAction: 'Reintentar',
};

const FINANCE_ACTIONS: FinanceAction[] = [
  {
    id: 'deposit',
    label: 'Depositar',
    description: 'Agregar saldo',
    route: '/wallet/deposit',
    icon: 'plus',
    classes: {
      card:
        'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/10',
      iconBg: 'bg-emerald-500/10',
      icon: 'text-emerald-600',
    },
  },
  {
    id: 'withdraw',
    label: 'Retirar',
    description: 'Transferir a tu cuenta',
    route: '/wallet/payouts',
    icon: 'money',
    classes: {
      card: 'border-teal-500/20 hover:border-teal-500/40 hover:shadow-teal-500/10',
      iconBg: 'bg-teal-500/10',
      icon: 'text-teal-600',
    },
  },
  {
    id: 'history',
    label: 'Movimientos',
    description: 'Ver historial',
    route: '/wallet/history',
    icon: 'clipboard',
    classes: {
      card: 'border-sky-500/20 hover:border-sky-500/40 hover:shadow-sky-500/10',
      iconBg: 'bg-sky-500/10',
      icon: 'text-sky-600',
    },
  },
  {
    id: 'earnings',
    label: 'Ganancias',
    description: 'Estadísticas',
    route: '/dashboard/earnings',
    icon: 'chart-bar',
    classes: {
      card: 'border-indigo-500/20 hover:border-indigo-500/40 hover:shadow-indigo-500/10',
      iconBg: 'bg-indigo-500/10',
      icon: 'text-indigo-600',
    },
  },
];

const FINANCE_SECTIONS: FinanceSection[] = [
  {
    id: 'wallet',
    title: 'Wallet',
    description: 'Saldo y movimientos',
    route: '/wallet',
    cta: 'Abrir Wallet',
    helper: 'Consultá tu balance y administrá tus depósitos.',
    icon: 'wallet',
    badge: 'Principal',
    classes: {
      card: 'border-emerald-500/20 bg-emerald-500/5',
      iconBg: 'bg-emerald-500/10',
      icon: 'text-emerald-600',
      badge: 'bg-emerald-100 text-emerald-700',
      cta: 'bg-emerald-600 text-white hover:bg-emerald-700',
    },
  },
  {
    id: 'payouts',
    title: 'Retiros',
    description: 'Transferí a tu cuenta',
    route: '/wallet/payouts',
    cta: 'Solicitar retiro',
    helper: 'Configura tu cuenta y recibí tus fondos de forma segura.',
    icon: 'money',
    classes: {
      card: 'border-teal-500/20 bg-teal-500/5',
      iconBg: 'bg-teal-500/10',
      icon: 'text-teal-600',
      badge: 'bg-teal-100 text-teal-700',
      cta: 'bg-teal-600 text-white hover:bg-teal-700',
    },
  },
  {
    id: 'earnings',
    title: 'Mis Ganancias',
    description: 'Estadísticas e ingresos',
    route: '/dashboard/earnings',
    cta: 'Ver ganancias',
    helper: 'Revisá tu rendimiento mensual y tus ingresos totales.',
    icon: 'chart-bar',
    classes: {
      card: 'border-indigo-500/20 bg-indigo-500/5',
      iconBg: 'bg-indigo-500/10',
      icon: 'text-indigo-600',
      badge: 'bg-indigo-100 text-indigo-700',
      cta: 'bg-indigo-600 text-white hover:bg-indigo-700',
    },
  },
];

@Component({
  selector: 'app-finanzas-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, IconComponent, MoneyPipe, PressScaleDirective],
  templateUrl: './finanzas.page.html',
})
export class FinanzasPage implements OnInit {
  private readonly walletService = inject(WalletService);

  readonly copy = FINANCE_COPY;
  readonly actions = FINANCE_ACTIONS;
  readonly sections = FINANCE_SECTIONS;

  readonly walletError = computed(() => this.walletService.error());
  readonly walletLoading = computed(() => this.walletService.loading());
  readonly availableBalance = computed(() => this.walletService.availableBalance());
  readonly lockedBalance = computed(() => this.walletService.lockedBalance());
  readonly withdrawableBalance = computed(() => this.walletService.withdrawableBalance());

  async ngOnInit(): Promise<void> {
    try {
      await this.walletService.fetchBalance();
    } catch {
      // Errors are surfaced via walletError.
    }
  }

  async refreshWallet(): Promise<void> {
    try {
      await this.walletService.fetchBalance(true);
    } catch {
      // Errors are surfaced via walletError.
    }
  }
}
