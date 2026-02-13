/**
 * Guarantee Tiers Model
 *
 * IMPORTANTE: Este modelo separa dos conceptos:
 * 1. VehicleTier (6) - Define el hold BASE según valor del auto
 * 2. MembershipPlan (3) - Define el descuento % para el usuario
 *
 * El FGO solo paga el buy-down: hold_base - hold_con_descuento
 *
 * Created: 2026-02-05
 */

// ============================================================================
// VEHICLE TIER (del auto) - 6 tiers
// ============================================================================

/**
 * Tier del vehículo basado en su valor USD
 * Define el hold base que debe pagar el renter
 */
export type VehicleTier = 'starter' | 'economy' | 'standard' | 'silver' | 'premium' | 'luxury';

/**
 * Configuración de cada tier de vehículo
 */
export interface VehicleTierConfig {
  tier: VehicleTier;
  valueMinUsd: number | null;
  valueMaxUsd: number | null;
  holdBaseUsd: number;
  description: string;
}

/**
 * Configuración de todos los tiers de vehículos
 * Fuente única de verdad para holds base
 */
export const VEHICLE_TIER_CONFIG: Record<VehicleTier, VehicleTierConfig> = {
  starter: {
    tier: 'starter',
    valueMinUsd: null,
    valueMaxUsd: 8000,
    holdBaseUsd: 300,
    description: 'Autos económicos de entrada (< USD 8,000)',
  },
  economy: {
    tier: 'economy',
    valueMinUsd: 8000,
    valueMaxUsd: 15000,
    holdBaseUsd: 500,
    description: 'Autos económicos de uso diario (USD 8,000 - 15,000)',
  },
  standard: {
    tier: 'standard',
    valueMinUsd: 15000,
    valueMaxUsd: 25000,
    holdBaseUsd: 800,
    description: 'Autos de gama media (USD 15,000 - 25,000)',
  },
  silver: {
    tier: 'silver',
    valueMinUsd: 25000,
    valueMaxUsd: 40000,
    holdBaseUsd: 1500,
    description: 'Autos de gama media-alta (USD 25,000 - 40,000)',
  },
  premium: {
    tier: 'premium',
    valueMinUsd: 40000,
    valueMaxUsd: 70000,
    holdBaseUsd: 2500,
    description: 'Autos premium (USD 40,000 - 70,000)',
  },
  luxury: {
    tier: 'luxury',
    valueMinUsd: 70000,
    valueMaxUsd: null,
    holdBaseUsd: 4000,
    description: 'Autos de lujo (> USD 70,000)',
  },
};

/**
 * Orden de tiers para comparaciones
 */
export const VEHICLE_TIER_ORDER: VehicleTier[] = [
  'starter',
  'economy',
  'standard',
  'silver',
  'premium',
  'luxury',
];

// ============================================================================
// MEMBERSHIP PLAN (del usuario) - 3 planes + none
// ============================================================================

/**
 * Plan de membresía del usuario
 * Define el descuento % sobre el hold base
 */
export type MembershipPlan = 'none' | 'club' | 'silver' | 'black';

/**
 * Configuración de cada plan de membresía
 */
export interface MembershipPlanConfig {
  plan: MembershipPlan;
  name: string;
  priceMonthlyUsd: number;
  holdDiscountPct: number; // 0.25 = 25% descuento
  maxVehicleTier: VehicleTier; // Gating: máximo tier accesible con descuento
  features: string[];
}

/**
 * Configuración de todos los planes de membresía
 * El descuento SOLO aplica si el auto está dentro del maxVehicleTier
 */
export const MEMBERSHIP_CONFIG: Record<Exclude<MembershipPlan, 'none'>, MembershipPlanConfig> = {
  club: {
    plan: 'club',
    name: 'Club Access',
    priceMonthlyUsd: 24.99,
    holdDiscountPct: 0.25, // 25% descuento
    maxVehicleTier: 'standard', // Hasta autos de USD 25,000
    features: [
      '25% OFF en Garantía',
      'Acceso a autos hasta USD 25,000',
      'Soporte prioritario',
      'FGO buy-down incluido',
    ],
  },
  silver: {
    plan: 'silver',
    name: 'Silver Access',
    priceMonthlyUsd: 34.99,
    holdDiscountPct: 0.4, // 40% descuento
    maxVehicleTier: 'premium', // Hasta autos de USD 70,000
    features: [
      '40% OFF en Garantía',
      'Acceso a autos hasta USD 70,000',
      'Soporte VIP 24/7',
      'FGO buy-down incluido',
      'Cancelación flexible',
    ],
  },
  black: {
    plan: 'black',
    name: 'Black Access',
    priceMonthlyUsd: 69.99,
    holdDiscountPct: 0.5, // 50% descuento
    maxVehicleTier: 'luxury', // Todos los autos
    features: [
      '50% OFF en Garantía',
      'Acceso a TODA la flota',
      'Soporte VIP exclusivo 24/7',
      'FGO buy-down incluido',
      'Cancelación flexible',
      'Prioridad en reservas premium',
    ],
  },
};

// ============================================================================
// OPERATIONAL FLOOR — Minimum hold regardless of membership discount
// Prevents holds from dropping below operational cost of a claim
// ============================================================================
export const OPERATIONAL_FLOOR: Record<VehicleTier, number> = {
  starter: 150,
  economy: 250,
  standard: 400,
  silver: 750,
  premium: 1250,
  luxury: 2500,  // Raised from $2,000 Black discount to $2,500
};

/**
 * Activation lock: minimum wallet lock at subscription purchase.
 * Acts as "skin in the game" — user commits starter floor ($150)
 * when buying membership. Released when subscription expires.
 * At booking time, the full guarantee locks separately.
 */
export const ACTIVATION_LOCK_USD = OPERATIONAL_FLOOR.starter; // $150

// ============================================================================
// CÁLCULO DE HOLD Y BUY-DOWN
// ============================================================================

/**
 * Resultado del cálculo de hold
 */
export interface HoldCalculation {
  holdUsd: number; // Hold final que paga el renter
  baseHoldUsd: number; // Hold base sin descuento
  buyDownFgoUsd: number; // Lo que paga FGO (base - hold)
  discountPct: number; // Porcentaje de descuento aplicado
  discountApplied: boolean; // Si se aplicó descuento
  vehicleTier: VehicleTier;
  membershipPlan: MembershipPlan;
  formula: string; // Descripción para UI
}

/**
 * Calcula el hold y buy-down FGO
 *
 * @param vehicleTier - Tier del vehículo
 * @param membershipPlan - Plan de membresía del usuario
 * @returns HoldCalculation con todos los valores
 */
export function calcHoldAndBuydown(
  vehicleTier: VehicleTier,
  membershipPlan: MembershipPlan = 'none',
): HoldCalculation {
  const tierConfig = VEHICLE_TIER_CONFIG[vehicleTier];
  const baseHold = tierConfig.holdBaseUsd;

  // Sin membresía: hold completo, sin buy-down
  if (membershipPlan === 'none') {
    return {
      holdUsd: baseHold,
      baseHoldUsd: baseHold,
      buyDownFgoUsd: 0,
      discountPct: 0,
      discountApplied: false,
      vehicleTier,
      membershipPlan,
      formula: `Garantía estándar: USD ${baseHold}`,
    };
  }

  const memberConfig = MEMBERSHIP_CONFIG[membershipPlan];

  // Verificar si el tier del auto está dentro del límite de la membresía
  const tierIndex = VEHICLE_TIER_ORDER.indexOf(vehicleTier);
  const maxTierIndex = VEHICLE_TIER_ORDER.indexOf(memberConfig.maxVehicleTier);

  // Si el auto excede el tier máximo de la membresía, no aplica descuento
  if (tierIndex > maxTierIndex) {
    return {
      holdUsd: baseHold,
      baseHoldUsd: baseHold,
      buyDownFgoUsd: 0,
      discountPct: 0,
      discountApplied: false,
      vehicleTier,
      membershipPlan,
      formula: `Garantía estándar (auto excede ${memberConfig.name}): USD ${baseHold}`,
    };
  }

  // Calcular descuento con operational floor
  const discount = memberConfig.holdDiscountPct;
  const holdDiscounted = Math.round(baseHold * (1 - discount));
  const floor = OPERATIONAL_FLOOR[vehicleTier];
  const holdFinal = Math.max(holdDiscounted, floor);
  const buyDown = baseHold - holdFinal;

  return {
    holdUsd: holdFinal,
    baseHoldUsd: baseHold,
    buyDownFgoUsd: buyDown,
    discountPct: discount,
    discountApplied: true,
    vehicleTier,
    membershipPlan,
    formula: `Garantía ${memberConfig.name} (${discount * 100}% off): USD ${holdFinal}`,
  };
}

/**
 * Obtiene el VehicleTier basado en el valor USD del auto
 */
export function getVehicleTierByValue(valueUsd: number | null | undefined): VehicleTier {
  if (valueUsd === null || valueUsd === undefined) {
    return 'standard'; // Default
  }

  if (valueUsd < 8000) return 'starter';
  if (valueUsd < 15000) return 'economy';
  if (valueUsd < 25000) return 'standard';
  if (valueUsd < 40000) return 'silver';
  if (valueUsd <= 70000) return 'premium';
  return 'luxury';
}

/**
 * Obtiene el hold base para un valor de auto dado
 */
export function getHoldBaseByValue(valueUsd: number | null | undefined): number {
  const tier = getVehicleTierByValue(valueUsd);
  return VEHICLE_TIER_CONFIG[tier].holdBaseUsd;
}

// ============================================================================
// HELPERS PARA UI
// ============================================================================

/**
 * Formatea el hold para mostrar en UI
 */
export function formatHoldUsd(amount: number): string {
  return `USD ${amount.toLocaleString('en-US')}`;
}

/**
 * Obtiene el nombre legible del tier
 */
export function getVehicleTierName(tier: VehicleTier): string {
  const names: Record<VehicleTier, string> = {
    starter: 'Starter',
    economy: 'Economy',
    standard: 'Standard',
    silver: 'Silver',
    premium: 'Premium',
    luxury: 'Luxury',
  };
  return names[tier];
}

/**
 * Obtiene el nombre legible del plan de membresía
 */
export function getMembershipPlanName(plan: MembershipPlan): string {
  if (plan === 'none') return 'Sin membresía';
  return MEMBERSHIP_CONFIG[plan].name;
}

/**
 * Convierte SubscriptionTier (DB/Edge) a MembershipPlan (modelo de garantías).
 * club_standard → club, club_black → silver, club_luxury → black
 */
export function subscriptionTierToMembershipPlan(
  tier: 'club_standard' | 'club_black' | 'club_luxury' | null | undefined,
): MembershipPlan {
  switch (tier) {
    case 'club_standard': return 'club';
    case 'club_black':    return 'silver';
    case 'club_luxury':   return 'black';
    default:              return 'none';
  }
}

/**
 * Verifica si una membresía puede acceder a un tier de vehículo con descuento
 */
export function canAccessTierWithDiscount(
  membershipPlan: MembershipPlan,
  vehicleTier: VehicleTier,
): boolean {
  if (membershipPlan === 'none') return false;

  const memberConfig = MEMBERSHIP_CONFIG[membershipPlan];
  const tierIndex = VEHICLE_TIER_ORDER.indexOf(vehicleTier);
  const maxTierIndex = VEHICLE_TIER_ORDER.indexOf(memberConfig.maxVehicleTier);

  return tierIndex <= maxTierIndex;
}

/**
 * Sugiere upgrade de membresía si el auto excede el tier actual
 */
export function suggestMembershipUpgrade(
  currentPlan: MembershipPlan,
  vehicleTier: VehicleTier,
): MembershipPlan | null {
  if (currentPlan === 'black') return null; // Ya tiene el máximo

  const tierIndex = VEHICLE_TIER_ORDER.indexOf(vehicleTier);

  // Verificar si necesita upgrade
  if (currentPlan === 'none' || currentPlan === 'club') {
    if (tierIndex > VEHICLE_TIER_ORDER.indexOf('standard')) {
      // Necesita Silver o Black
      if (tierIndex > VEHICLE_TIER_ORDER.indexOf('premium')) {
        return 'black';
      }
      return 'silver';
    }
    if (currentPlan === 'none') {
      return 'club'; // Sugerir al menos Club
    }
  }

  if (currentPlan === 'silver') {
    if (tierIndex > VEHICLE_TIER_ORDER.indexOf('premium')) {
      return 'black';
    }
  }

  return null; // No necesita upgrade
}

// ============================================================================
// TABLA DE REFERENCIA RÁPIDA
// ============================================================================

/**
 * Genera tabla de referencia con todos los holds posibles
 * Útil para documentación y debugging
 */
export function generateHoldReferenceTable(): Array<{
  vehicleTier: VehicleTier;
  valueRange: string;
  noMembership: number;
  club: number;
  silver: number;
  black: number;
}> {
  return VEHICLE_TIER_ORDER.map((tier) => {
    const config = VEHICLE_TIER_CONFIG[tier];
    const minStr = config.valueMinUsd ? `$${config.valueMinUsd / 1000}k` : '';
    const maxStr = config.valueMaxUsd ? `$${config.valueMaxUsd / 1000}k` : '+';
    const valueRange = config.valueMinUsd ? `${minStr} - ${maxStr}` : `< ${maxStr}`;

    return {
      vehicleTier: tier,
      valueRange,
      noMembership: calcHoldAndBuydown(tier, 'none').holdUsd,
      club: calcHoldAndBuydown(tier, 'club').holdUsd,
      silver: calcHoldAndBuydown(tier, 'silver').holdUsd,
      black: calcHoldAndBuydown(tier, 'black').holdUsd,
    };
  });
}

/*
TABLA DE REFERENCIA:

| Vehicle Tier | Valor USD       | Sin Membresía | Club (25%) | Silver (40%) | Black (50%) |
|--------------|-----------------|---------------|------------|--------------|-------------|
| starter      | < $8k           | USD 300       | USD 225    | USD 180      | USD 150     |
| economy      | $8k - $15k      | USD 500       | USD 375    | USD 300      | USD 250     |
| standard     | $15k - $25k     | USD 800       | USD 600    | USD 480      | USD 400     |
| silver       | $25k - $40k     | USD 1,500     | USD 1,500* | USD 900      | USD 750     |
| premium      | $40k - $70k     | USD 2,500     | USD 2,500* | USD 1,500    | USD 1,250   |
| luxury       | > $70k          | USD 4,000     | USD 4,000* | USD 4,000*   | USD 2,000   |

* Sin descuento porque excede el maxVehicleTier de la membresía

BUY-DOWN FGO = Hold Base - Hold Final
Ejemplo: Silver tier + Club membership
- Hold Base: USD 1,500
- Hold Final: USD 1,500 (sin descuento, excede Club)
- Buy-Down FGO: USD 0

Ejemplo: Standard tier + Club membership
- Hold Base: USD 800
- Hold Final: USD 600 (25% off)
- Buy-Down FGO: USD 200
*/
