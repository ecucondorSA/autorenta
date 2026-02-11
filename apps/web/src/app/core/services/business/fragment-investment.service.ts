import { Injectable, computed, inject, signal } from '@angular/core';
import type { FunctionsError } from '@supabase/supabase-js';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import type { Database } from '@core/types/database.types';

type FragmentStatsRow = Database['public']['Views']['v_vehicle_fragment_stats']['Row'];

const MIN_FRAGMENT_QUANTITY = 1;
const MAX_FRAGMENT_QUANTITY = 200;

interface CreateFragmentPreferenceResponse {
  success?: boolean;
  purchase_id?: string;
  preference_id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  amount_ars?: number;
  amount_usd_cents?: number;
  quantity?: number;
  usd_ars_rate?: number;
  error?: string;
  code?: string;
}

export interface InvestorStats {
  activeCars: number;
  completedTrips: number;
  totalUsers: number;
  totalGmvUsd: number;
  totalGmvArs: number;
  generatedAt: string | null;
}

export interface FragmentAssetStats {
  vehicleAssetId: string;
  assetCode: string;
  totalFragments: number;
  fragmentsSold: number;
  fragmentsAvailable: number;
  fragmentPriceCents: number;
  status: string;
}

export interface FragmentPurchasePreview {
  quantity: number;
  unitPriceUsd: number;
  totalPriceUsd: number;
}

export interface FragmentPreferenceResult {
  purchaseId: string;
  preferenceId: string;
  initPoint: string;
  quantity: number;
  amountUsdCents: number;
  amountArs: number;
  usdArsRate: number;
}

export interface FragmentPortfolioItem {
  vehicleAssetId: string;
  assetCode: string;
  vehicleName: string;
  vehicleYear: number;
  vehicleStatus: string;
  quantity: number;
  purchasePriceCents: number;
  currentNavCents: number | null;
  navPeriod: string | null;
  totalDistributionsCents: number;
  distributionCount: number;
  heldSince: string;
}

export interface FragmentDistributionPayout {
  id: string;
  distributionId: string;
  fragmentsHeld: number;
  amountCents: number;
  currency: string;
  status: string;
  createdAt: string;
  /** Joined from fragment_distributions */
  assetCode: string | null;
  bookingId: string | null;
}

export class FragmentInvestmentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'FragmentInvestmentError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class FragmentInvestmentService {
  private readonly supabase = injectSupabase();
  private readonly logger = inject(LoggerService).createChildLogger('FragmentInvestmentService');

  // ── Portfolio signals ──────────────────────────────────────
  readonly portfolio = signal<FragmentPortfolioItem[]>([]);
  readonly distributions = signal<FragmentDistributionPayout[]>([]);
  readonly portfolioLoading = signal(false);
  readonly distributionsLoading = signal(false);

  readonly hasHoldings = computed(() => this.portfolio().length > 0);

  readonly totalInvestedCents = computed(() =>
    this.portfolio().reduce((sum, item) => sum + item.purchasePriceCents * item.quantity, 0),
  );

  readonly totalDistributedCents = computed(() =>
    this.portfolio().reduce((sum, item) => sum + item.totalDistributionsCents, 0),
  );

  readonly totalFragments = computed(() =>
    this.portfolio().reduce((sum, item) => sum + item.quantity, 0),
  );

  // ── Portfolio methods ──────────────────────────────────────

  async fetchMyPortfolio(): Promise<FragmentPortfolioItem[]> {
    this.portfolioLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('v_my_fragment_portfolio')
        .select('*');

      if (error) {
        this.logger.error('Failed to fetch portfolio', { error });
        return [];
      }

      const items: FragmentPortfolioItem[] = (data ?? []).map((row) => ({
        vehicleAssetId: row.vehicle_asset_id ?? '',
        assetCode: row.asset_code ?? '',
        vehicleName: row.vehicle_name ?? '',
        vehicleYear: row.vehicle_year ?? 0,
        vehicleStatus: row.vehicle_status ?? 'unknown',
        quantity: this.toPositiveInteger(row.quantity, 0),
        purchasePriceCents: this.toPositiveInteger(row.purchase_price_cents, 0),
        currentNavCents: typeof row.current_nav_cents === 'number' ? row.current_nav_cents : null,
        navPeriod: row.nav_period ?? null,
        totalDistributionsCents: this.toPositiveInteger(row.total_distributions_cents, 0),
        distributionCount: this.toPositiveInteger(row.distribution_count, 0),
        heldSince: row.held_since ?? '',
      }));

      this.portfolio.set(items);
      return items;
    } finally {
      this.portfolioLoading.set(false);
    }
  }

  async fetchMyDistributions(): Promise<FragmentDistributionPayout[]> {
    this.distributionsLoading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('fragment_distribution_payouts')
        .select(`
          id, distribution_id, fragments_held, amount_cents,
          currency, status, created_at,
          fragment_distributions!inner (
            booking_id,
            vehicle_asset_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        this.logger.error('Failed to fetch distributions', { error });
        return [];
      }

      // Fetch asset codes for each unique vehicle_asset_id
      const vehicleIds = new Set<string>();
      for (const row of data ?? []) {
        const dist = row.fragment_distributions as unknown as {
          vehicle_asset_id: string;
          booking_id: string | null;
        };
        if (dist?.vehicle_asset_id) vehicleIds.add(dist.vehicle_asset_id);
      }

      let assetCodeMap = new Map<string, string>();
      if (vehicleIds.size > 0) {
        const { data: assets } = await this.supabase
          .from('vehicle_assets')
          .select('id, asset_code')
          .in('id', [...vehicleIds]);
        if (assets) {
          assetCodeMap = new Map(assets.map((a) => [a.id, a.asset_code]));
        }
      }

      const items: FragmentDistributionPayout[] = (data ?? []).map((row) => {
        const dist = row.fragment_distributions as unknown as {
          vehicle_asset_id: string;
          booking_id: string | null;
        };
        return {
          id: row.id,
          distributionId: row.distribution_id,
          fragmentsHeld: row.fragments_held,
          amountCents: row.amount_cents,
          currency: row.currency,
          status: row.status,
          createdAt: row.created_at,
          assetCode: dist?.vehicle_asset_id ? (assetCodeMap.get(dist.vehicle_asset_id) ?? null) : null,
          bookingId: dist?.booking_id ?? null,
        };
      });

      this.distributions.set(items);
      return items;
    } finally {
      this.distributionsLoading.set(false);
    }
  }

  async getInvestorStats(): Promise<InvestorStats> {
    const fallback: InvestorStats = {
      activeCars: 28,
      completedTrips: 120,
      totalUsers: 350,
      totalGmvUsd: 1500,
      totalGmvArs: 1800000,
      generatedAt: null,
    };

    const { data, error } = await this.supabase.functions.invoke<{
      active_cars?: number | null;
      completed_trips?: number | null;
      total_users?: number | null;
      total_gmv_usd?: number | null;
      total_gmv_ars?: number | null;
      generated_at?: string | null;
    }>('public-investor-stats');

    if (error || !data) {
      this.logger.warn('Could not load investor stats, using fallback', error ?? {});
      return fallback;
    }

    return {
      activeCars: this.toPositiveInteger(data.active_cars, fallback.activeCars),
      completedTrips: this.toPositiveInteger(data.completed_trips, fallback.completedTrips),
      totalUsers: this.toPositiveInteger(data.total_users, fallback.totalUsers),
      totalGmvUsd: this.toPositiveInteger(data.total_gmv_usd, fallback.totalGmvUsd),
      totalGmvArs: this.toPositiveInteger(data.total_gmv_ars, fallback.totalGmvArs),
      generatedAt: typeof data.generated_at === 'string' ? data.generated_at : null,
    };
  }

  async getFragmentAssetStats(assetCode: string): Promise<FragmentAssetStats> {
    const normalizedCode = assetCode.trim().toUpperCase();
    if (!normalizedCode) {
      throw new FragmentInvestmentError('INVALID_ASSET_CODE', 'Asset code is required');
    }

    const { data, error } = await this.supabase
      .from('v_vehicle_fragment_stats')
      .select(
        'vehicle_asset_id, asset_code, total_fragments, fragments_sold, fragments_available, fragment_price_cents, status',
      )
      .eq('asset_code', normalizedCode)
      .maybeSingle();

    if (error) {
      this.logger.error('Failed to fetch fragment stats', { assetCode: normalizedCode, error });
      throw new FragmentInvestmentError(
        'FRAGMENT_STATS_ERROR',
        'No pudimos cargar la disponibilidad de fragmentos',
      );
    }

    if (!data) {
      throw new FragmentInvestmentError('ASSET_NOT_FOUND', 'Activo no encontrado');
    }

    return this.mapFragmentStats(data);
  }

  buildPurchasePreview(quantity: number, fragmentPriceCents: number): FragmentPurchasePreview {
    const safeQuantity = this.normalizeQuantity(quantity);
    const safePriceCents = this.toPositiveInteger(fragmentPriceCents, 0);
    const unitPriceUsd = safePriceCents / 100;

    return {
      quantity: safeQuantity,
      unitPriceUsd,
      totalPriceUsd: unitPriceUsd * safeQuantity,
    };
  }

  async createFragmentPreference(input: {
    assetCode: string;
    quantity: number;
  }): Promise<FragmentPreferenceResult> {
    const assetCode = input.assetCode.trim().toUpperCase();
    if (!assetCode) {
      throw new FragmentInvestmentError('INVALID_ASSET_CODE', 'Asset code is required');
    }

    const quantity = input.quantity;
    if (
      !Number.isInteger(quantity) ||
      quantity < MIN_FRAGMENT_QUANTITY ||
      quantity > MAX_FRAGMENT_QUANTITY
    ) {
      throw new FragmentInvestmentError(
        'INVALID_QUANTITY',
        `La cantidad debe ser un entero entre ${MIN_FRAGMENT_QUANTITY} y ${MAX_FRAGMENT_QUANTITY}`,
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await this.supabase.auth.getSession();

    if (sessionError) {
      this.logger.error('Could not resolve auth session before purchase', sessionError);
      throw new FragmentInvestmentError('AUTH_SESSION_ERROR', 'No pudimos validar tu sesión');
    }

    if (!session) {
      throw new FragmentInvestmentError(
        'AUTH_REQUIRED',
        'Debes iniciar sesión para comprar fragmentos',
      );
    }

    const returnUrl = this.getInvestorsReturnUrl();
    const body: { vehicle_asset_code: string; quantity: number; return_url?: string } = {
      vehicle_asset_code: assetCode,
      quantity,
    };
    if (returnUrl) {
      body.return_url = returnUrl;
    }

    const { data, error } = await this.supabase.functions.invoke<CreateFragmentPreferenceResponse>(
      'create-fragment-preference',
      { body },
    );

    if (error) {
      const parsed = await this.extractFunctionError(error);
      throw new FragmentInvestmentError(parsed.code, parsed.message);
    }

    if (!data?.success || !data.init_point || !data.purchase_id || !data.preference_id) {
      this.logger.error('Invalid create-fragment-preference response', { data });
      throw new FragmentInvestmentError(
        'INVALID_FUNCTION_RESPONSE',
        'No pudimos iniciar el checkout de fragmentos',
      );
    }

    return {
      purchaseId: data.purchase_id,
      preferenceId: data.preference_id,
      initPoint: data.init_point,
      quantity: this.toPositiveInteger(data.quantity, quantity),
      amountUsdCents: this.toPositiveInteger(data.amount_usd_cents, 0),
      amountArs: this.toPositiveInteger(data.amount_ars, 0),
      usdArsRate: Number.isFinite(data.usd_ars_rate) ? Number(data.usd_ars_rate) : 0,
    };
  }

  private mapFragmentStats(row: FragmentStatsRow): FragmentAssetStats {
    return {
      vehicleAssetId: row.vehicle_asset_id ?? '',
      assetCode: row.asset_code ?? '',
      totalFragments: this.toPositiveInteger(row.total_fragments, 0),
      fragmentsSold: this.toPositiveInteger(row.fragments_sold, 0),
      fragmentsAvailable: this.toPositiveInteger(row.fragments_available, 0),
      fragmentPriceCents: this.toPositiveInteger(row.fragment_price_cents, 0),
      status: row.status ?? 'unknown',
    };
  }

  private normalizeQuantity(quantity: number): number {
    if (!Number.isFinite(quantity)) {
      return MIN_FRAGMENT_QUANTITY;
    }

    return Math.min(
      MAX_FRAGMENT_QUANTITY,
      Math.max(MIN_FRAGMENT_QUANTITY, Math.trunc(quantity)),
    );
  }

  private toPositiveInteger(value: number | null | undefined, fallback: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return fallback;
    }

    return Math.max(0, Math.round(value));
  }

  private getInvestorsReturnUrl(): string | undefined {
    if (typeof window === 'undefined' || !window.location?.origin) {
      return undefined;
    }

    return `${window.location.origin}/investors`;
  }

  private async extractFunctionError(error: unknown): Promise<{ code: string; message: string }> {
    const fallback = {
      code: 'FUNCTION_ERROR',
      message: 'No pudimos iniciar la compra de fragmentos',
    };

    const functionError = error as FunctionsError & {
      context?: Response;
      message?: string;
    };

    if (functionError.context) {
      const parsedBody = await this.readFunctionErrorBody(functionError.context);
      const httpCode = `HTTP_${functionError.context.status}`;

      return {
        code:
          typeof parsedBody?.code === 'string' && parsedBody.code.length > 0
            ? parsedBody.code
            : httpCode,
        message:
          (typeof parsedBody?.error === 'string' && parsedBody.error) ||
          (typeof parsedBody?.message === 'string' && parsedBody.message) ||
          fallback.message,
      };
    }

    if (functionError.message && functionError.message !== 'FunctionsHttpError') {
      return { code: 'FUNCTION_ERROR', message: functionError.message };
    }

    return fallback;
  }

  private async readFunctionErrorBody(
    response: Response,
  ): Promise<{ error?: string; message?: string; code?: string } | null> {
    try {
      return (await response.clone().json()) as {
        error?: string;
        message?: string;
        code?: string;
      };
    } catch {
      try {
        const text = await response.clone().text();
        if (!text) {
          return null;
        }

        return JSON.parse(text) as {
          error?: string;
          message?: string;
          code?: string;
        };
      } catch {
        return null;
      }
    }
  }
}
