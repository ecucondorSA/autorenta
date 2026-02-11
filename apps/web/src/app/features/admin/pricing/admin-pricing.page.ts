import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AdminFeatureFacadeService } from '@core/services/facades/admin-feature-facade.service';
import { PricingService } from '@core/services/payments/pricing.service';
import { DynamicPricingService } from '@core/services/payments/dynamic-pricing.service';

interface PricingRule {
  id: string;
  name: string;
  rule_type: 'percentage' | 'fixed' | 'multiplier';
  value: number;
  conditions: Record<string, unknown>;
  is_active: boolean;
  priority: number;
  created_at: string;
}

interface DeliveryPricingConfig {
  base_fee: number;
  per_km_fee: number;
  local_max_km: number;
  regional_max_km: number;
}

@Component({
  standalone: true,
  selector: 'app-admin-pricing-page',
  imports: [FormsModule, TranslateModule],
  templateUrl: './admin-pricing.page.html',
  styleUrl: './admin-pricing.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPricingPage implements OnInit {
  private readonly adminFacade = inject(AdminFeatureFacadeService);
  private readonly pricingService = inject(PricingService);
  private readonly dynamicPricingService = inject(DynamicPricingService);

  protected readonly pricingRules = signal<PricingRule[]>([]);
  protected readonly deliveryConfig = signal<DeliveryPricingConfig>({
    base_fee: 500,
    per_km_fee: 50,
    local_max_km: 20,
    regional_max_km: 100,
  });

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Form for new rule
  protected readonly newRule = signal({
    name: '',
    rule_type: 'percentage' as 'percentage' | 'fixed' | 'multiplier',
    value: 0,
    is_active: true,
    priority: 100,
  });

  async ngOnInit(): Promise<void> {
    await this.loadPricingData();
  }

  private async loadPricingData(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.error.set(null);

      // Load pricing rules
      const rules = await this.adminFacade.listPricingRules();
      this.pricingRules.set((rules as unknown as PricingRule[]) || []);

      // Load delivery config (from config table or defaults)
      const configValue = await this.adminFacade.getAppConfig('delivery_pricing');
      if (configValue) {
        this.deliveryConfig.set(JSON.parse(configValue));
      }
    } catch (err) {
      console.error('Error loading pricing data:', err);
      this.error.set(
        err instanceof Error ? err.message : 'Error al cargar configuración de precios',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async createRule(): Promise<void> {
    try {
      this.isSaving.set(true);
      this.error.set(null);
      this.successMessage.set(null);

      const rule = this.newRule();
      if (!rule.name || rule.value === 0) {
        this.error.set('Por favor completa todos los campos');
        return;
      }

      await this.adminFacade.createPricingRule({
        name: rule.name,
        rule_type: rule.rule_type,
        value: rule.value,
        is_active: rule.is_active,
        priority: rule.priority,
        conditions: {},
      });

      this.successMessage.set('Regla creada exitosamente');
      this.newRule.set({
        name: '',
        rule_type: 'percentage',
        value: 0,
        is_active: true,
        priority: 100,
      });

      await this.loadPricingData();
    } catch (err) {
      console.error('Error creating rule:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al crear regla');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async toggleRule(ruleId: string, isActive: boolean): Promise<void> {
    try {
      await this.adminFacade.updatePricingRule(ruleId, { is_active: !isActive });

      await this.loadPricingData();
      this.successMessage.set('Regla actualizada');
    } catch (err) {
      console.error('Error toggling rule:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al actualizar regla');
    }
  }

  protected async deleteRule(ruleId: string): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar esta regla?')) return;

    try {
      await this.adminFacade.deletePricingRule(ruleId);

      await this.loadPricingData();
      this.successMessage.set('Regla eliminada');
    } catch (err) {
      console.error('Error deleting rule:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al eliminar regla');
    }
  }

  protected async saveDeliveryConfig(): Promise<void> {
    try {
      this.isSaving.set(true);
      this.error.set(null);
      this.successMessage.set(null);

      await this.adminFacade.upsertAppConfig(
        'delivery_pricing',
        JSON.stringify(this.deliveryConfig()),
      );

      this.successMessage.set('Configuración de delivery guardada');
    } catch (err) {
      console.error('Error saving delivery config:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al guardar configuración');
    } finally {
      this.isSaving.set(false);
    }
  }

  protected formatRuleType(type: string): string {
    const types: Record<string, string> = {
      percentage: 'Porcentaje',
      fixed: 'Monto Fijo',
      multiplier: 'Multiplicador',
    };
    return types[type] || type;
  }

  protected formatValue(rule: PricingRule): string {
    switch (rule.rule_type) {
      case 'percentage':
        return `${rule.value}%`;
      case 'fixed':
        return `$${rule.value}`;
      case 'multiplier':
        return `x${rule.value}`;
      default:
        return String(rule.value);
    }
  }
}
