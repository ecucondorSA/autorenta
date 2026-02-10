/**
 * Reward Pool Model - Senior Implementation v1.0
 *
 * ARQUITECTURA:
 * - Pool distribuido POR AUTO (no por owner)
 * - Fórmula MULTIPLICATIVA (no aditiva 50/30/20)
 * - Verified Availability (VA) como gate principal
 * - Anti-gaming: caps, smoothing, demand factor
 *
 * FÓRMULA DIARIA:
 * points_day = BASE_POINTS * VA_day * value_factor * rep_factor * demand_factor
 *
 * SHARE MENSUAL:
 * share_owner = sum(points_owner) / sum(points_all) * pool_month
 *
 * Created: 2026-02-05
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

/**
 * Base points per day for a car that meets all criteria
 */
export const BASE_POINTS_PER_DAY = 100;

/**
 * Maximum cars per owner that contribute to pool
 * Prevents whale dominance
 */
export const MAX_CARS_PER_OWNER = 5;

/**
 * Maximum share of monthly pool per owner
 * Ensures distribution across network
 */
export const MAX_POOL_SHARE_PER_OWNER = 0.15; // 15%

/**
 * Minimum days of verified availability to be eligible
 */
export const MIN_VA_DAYS_FOR_ELIGIBILITY = 7;

/**
 * Cooldown period after owner cancellation (days)
 * During cooldown, car earns 0 points
 */
export const CANCELLATION_COOLDOWN_DAYS = 14;

// ============================================================================
// VERIFIED AVAILABILITY (VA) - THE CORE ANTI-GAMING MECHANISM
// ============================================================================

/**
 * Thresholds for Verified Availability
 * If ANY threshold is not met, VA_day = 0
 */
export interface VAThresholds {
  /** Max hours to respond to booking request */
  maxResponseHours: number;
  /** Min acceptance rate (0-1) over rolling 30 days */
  minAcceptanceRate: number;
  /** Max owner cancellation rate (0-1) over rolling 90 days */
  maxCancellationRate: number;
  /** Price must be within X% of market median for similar cars */
  maxPriceDeviationPct: number;
}

export const VA_THRESHOLDS: VAThresholds = {
  maxResponseHours: 12,
  minAcceptanceRate: 0.7, // 70% acceptance
  maxCancellationRate: 0.05, // Max 5% owner cancellations
  maxPriceDeviationPct: 0.5, // Within 50% of market median
};

/**
 * Daily VA status for a car
 */
export interface DailyVAStatus {
  carId: string;
  date: string; // YYYY-MM-DD
  isReadyToBook: boolean;
  responseTimeHours: number | null;
  acceptanceRate30d: number;
  cancellationRate90d: number;
  priceDeviationPct: number | null;
  isVerified: boolean; // Final VA status
  failureReasons: VAFailureReason[];
}

export type VAFailureReason =
  | 'not_ready_to_book'
  | 'slow_response'
  | 'low_acceptance'
  | 'high_cancellation'
  | 'price_too_high'
  | 'in_cooldown'
  | 'owner_not_kyc';

/**
 * Calculate if a car has Verified Availability for a given day
 */
export function calculateVAStatus(
  isReadyToBook: boolean,
  responseTimeHours: number | null,
  acceptanceRate30d: number,
  cancellationRate90d: number,
  priceDeviationPct: number | null,
  isInCooldown: boolean,
  isOwnerKYC: boolean,
): { isVerified: boolean; failureReasons: VAFailureReason[] } {
  const failureReasons: VAFailureReason[] = [];

  if (!isOwnerKYC) {
    failureReasons.push('owner_not_kyc');
  }

  if (isInCooldown) {
    failureReasons.push('in_cooldown');
  }

  if (!isReadyToBook) {
    failureReasons.push('not_ready_to_book');
  }

  if (responseTimeHours !== null && responseTimeHours > VA_THRESHOLDS.maxResponseHours) {
    failureReasons.push('slow_response');
  }

  if (acceptanceRate30d < VA_THRESHOLDS.minAcceptanceRate) {
    failureReasons.push('low_acceptance');
  }

  if (cancellationRate90d > VA_THRESHOLDS.maxCancellationRate) {
    failureReasons.push('high_cancellation');
  }

  if (priceDeviationPct !== null && priceDeviationPct > VA_THRESHOLDS.maxPriceDeviationPct) {
    failureReasons.push('price_too_high');
  }

  return {
    isVerified: failureReasons.length === 0,
    failureReasons,
  };
}

// ============================================================================
// VALUE FACTOR - SUAVIZADO CON LOG (NO LINEAL)
// ============================================================================

/**
 * Value factor configuration
 * Uses logarithmic scaling to prevent luxury car dominance
 *
 * Formula: factor = 1 + ln(value_usd / BASE_VALUE) * SCALE
 * Capped at MIN and MAX
 */
export const VALUE_FACTOR_CONFIG = {
  baseValueUsd: 15000, // Reference value
  scale: 0.5, // Logarithmic scale factor
  min: 1.0, // Minimum factor
  max: 2.5, // Maximum factor (was 4.0, now capped)
};

/**
 * Calculate value factor for a car
 * Uses logarithmic scaling instead of linear tiers
 */
export function calculateValueFactor(valueUsd: number | null | undefined): number {
  if (valueUsd === null || valueUsd === undefined || valueUsd <= 0) {
    return VALUE_FACTOR_CONFIG.min;
  }

  // Logarithmic formula: 1 + ln(value/base) * scale
  const rawFactor =
    1 + Math.log(valueUsd / VALUE_FACTOR_CONFIG.baseValueUsd) * VALUE_FACTOR_CONFIG.scale;

  // Clamp to min/max
  return Math.max(VALUE_FACTOR_CONFIG.min, Math.min(VALUE_FACTOR_CONFIG.max, rawFactor));
}

/**
 * Value factor reference table (for documentation)
 */
export function getValueFactorTable(): Array<{ valueUsd: number; factor: number }> {
  const values = [5000, 8000, 10000, 15000, 20000, 25000, 40000, 70000, 100000, 150000];
  return values.map((v) => ({
    valueUsd: v,
    factor: Math.round(calculateValueFactor(v) * 100) / 100,
  }));
}

// ============================================================================
// REPUTATION FACTOR - BAYESIAN SMOOTHING
// ============================================================================

/**
 * Reputation factor configuration
 * Uses Bayesian smoothing to handle new owners fairly
 */
export const REP_FACTOR_CONFIG = {
  priorRating: 4.0, // Assumed rating for new owners
  priorWeight: 5, // Weight of prior (equivalent to 5 reviews)
  min: 0.7, // Minimum factor (very bad reputation)
  max: 1.2, // Maximum factor (excellent reputation)
  penaltyPerCancellation: 0.1, // Penalty per owner cancellation in last 90 days
  maxCancellationPenalty: 0.3, // Max penalty from cancellations
};

/**
 * Calculate reputation factor with Bayesian smoothing
 *
 * @param avgRating Average rating (1-5 scale)
 * @param reviewCount Number of reviews
 * @param ownerCancellations90d Owner cancellations in last 90 days
 */
export function calculateRepFactor(
  avgRating: number | null,
  reviewCount: number,
  ownerCancellations90d: number,
): number {
  // Bayesian smoothed rating
  const effectiveRating = avgRating ?? REP_FACTOR_CONFIG.priorRating;
  const smoothedRating =
    (effectiveRating * reviewCount +
      REP_FACTOR_CONFIG.priorRating * REP_FACTOR_CONFIG.priorWeight) /
    (reviewCount + REP_FACTOR_CONFIG.priorWeight);

  // Convert rating to factor (4.0 = 1.0, 5.0 = 1.2, 3.0 = 0.8)
  const ratingFactor = 0.6 + smoothedRating * 0.12;

  // Cancellation penalty
  const cancellationPenalty = Math.min(
    ownerCancellations90d * REP_FACTOR_CONFIG.penaltyPerCancellation,
    REP_FACTOR_CONFIG.maxCancellationPenalty,
  );

  const finalFactor = ratingFactor - cancellationPenalty;

  // Clamp to min/max
  return Math.max(REP_FACTOR_CONFIG.min, Math.min(REP_FACTOR_CONFIG.max, finalFactor));
}

// ============================================================================
// DEMAND FACTOR - LOCATION-BASED WEIGHTING
// ============================================================================

/**
 * Demand factor configuration
 * Rewards cars in high-demand areas
 */
export const DEMAND_FACTOR_CONFIG = {
  min: 0.8, // Low demand area
  neutral: 1.0, // Average demand
  max: 1.3, // High demand area
};

/**
 * Demand tier based on zone activity
 */
export type DemandTier = 'low' | 'medium' | 'high' | 'very_high';

/**
 * Calculate demand factor based on zone metrics
 *
 * @param searchImpressions30d Search impressions in the zone in last 30 days
 * @param bookingRequests30d Booking requests in the zone in last 30 days
 * @param conversionRate Booking conversion rate for the zone
 */
export function calculateDemandFactor(
  searchImpressions30d: number,
  bookingRequests30d: number,
  zoneMedianImpressions: number,
): number {
  if (zoneMedianImpressions <= 0) {
    return DEMAND_FACTOR_CONFIG.neutral;
  }

  // Demand index = impressions relative to network median
  const demandIndex = searchImpressions30d / zoneMedianImpressions;

  // Convert to factor
  if (demandIndex < 0.5) {
    return DEMAND_FACTOR_CONFIG.min;
  } else if (demandIndex < 1.0) {
    // Linear interpolation from 0.8 to 1.0
    return DEMAND_FACTOR_CONFIG.min + (demandIndex - 0.5) * 0.4;
  } else if (demandIndex < 2.0) {
    // Linear interpolation from 1.0 to 1.3
    return DEMAND_FACTOR_CONFIG.neutral + (demandIndex - 1.0) * 0.3;
  } else {
    return DEMAND_FACTOR_CONFIG.max;
  }
}

/**
 * Get demand tier label
 */
export function getDemandTier(demandFactor: number): DemandTier {
  if (demandFactor < 0.9) return 'low';
  if (demandFactor < 1.1) return 'medium';
  if (demandFactor < 1.2) return 'high';
  return 'very_high';
}

// ============================================================================
// DAILY POINTS CALCULATION
// ============================================================================

/**
 * Input for daily points calculation
 */
export interface DailyPointsInput {
  carId: string;
  ownerId: string;
  date: string; // YYYY-MM-DD

  // VA inputs
  isReadyToBook: boolean;
  responseTimeHours: number | null;
  acceptanceRate30d: number;
  cancellationRate90d: number;
  priceDeviationPct: number | null;
  isInCooldown: boolean;
  isOwnerKYC: boolean;

  // Value input
  valueUsd: number | null;

  // Reputation inputs
  avgRating: number | null;
  reviewCount: number;
  ownerCancellations90d: number;

  // Demand inputs
  searchImpressions30d: number;
  zoneMedianImpressions: number;
}

/**
 * Result of daily points calculation
 */
export interface DailyPointsResult {
  carId: string;
  ownerId: string;
  date: string;
  points: number;
  isEligible: boolean;

  // Breakdown
  basePoints: number;
  vaStatus: boolean;
  vaFailureReasons: VAFailureReason[];
  valueFactor: number;
  repFactor: number;
  demandFactor: number;

  // Formula explanation
  formula: string;
}

/**
 * Calculate daily points for a car
 *
 * points_day = BASE_POINTS * VA_day * value_factor * rep_factor * demand_factor
 */
export function calculateDailyPoints(input: DailyPointsInput): DailyPointsResult {
  // Step 1: Calculate VA status
  const va = calculateVAStatus(
    input.isReadyToBook,
    input.responseTimeHours,
    input.acceptanceRate30d,
    input.cancellationRate90d,
    input.priceDeviationPct,
    input.isInCooldown,
    input.isOwnerKYC,
  );

  // Step 2: Calculate factors
  const valueFactor = calculateValueFactor(input.valueUsd);
  const repFactor = calculateRepFactor(
    input.avgRating,
    input.reviewCount,
    input.ownerCancellations90d,
  );
  const demandFactor = calculateDemandFactor(
    input.searchImpressions30d,
    0, // bookingRequests not used in current formula
    input.zoneMedianImpressions,
  );

  // Step 3: Calculate points (multiplicative)
  const vaMultiplier = va.isVerified ? 1 : 0;
  const points = Math.round(
    BASE_POINTS_PER_DAY * vaMultiplier * valueFactor * repFactor * demandFactor,
  );

  // Step 4: Build formula explanation
  const formula = va.isVerified
    ? `${BASE_POINTS_PER_DAY} × 1 × ${valueFactor.toFixed(2)} × ${repFactor.toFixed(2)} × ${demandFactor.toFixed(2)} = ${points}`
    : `VA=0 (${va.failureReasons.join(', ')}) → 0 points`;

  return {
    carId: input.carId,
    ownerId: input.ownerId,
    date: input.date,
    points,
    isEligible: va.isVerified,
    basePoints: BASE_POINTS_PER_DAY,
    vaStatus: va.isVerified,
    vaFailureReasons: va.failureReasons,
    valueFactor,
    repFactor,
    demandFactor,
    formula,
  };
}

// ============================================================================
// MONTHLY POOL DISTRIBUTION
// ============================================================================

/**
 * Monthly points summary for an owner
 */
export interface OwnerMonthlyPoints {
  ownerId: string;
  totalPoints: number;
  carPoints: Array<{
    carId: string;
    points: number;
    eligibleDays: number;
  }>;
  eligibleCarsCount: number;
  cappedCarsCount: number; // Cars excluded due to MAX_CARS_PER_OWNER
}

/**
 * Monthly pool distribution result
 */
export interface PoolDistribution {
  month: string; // YYYY-MM
  totalPoolUsd: number;
  totalPointsNetwork: number;
  pointValueUsd: number; // USD per point

  ownerShares: Array<{
    ownerId: string;
    rawShare: number; // Before cap
    cappedShare: number; // After MAX_POOL_SHARE_PER_OWNER
    payoutUsd: number;
    pointsUsed: number;
    carCount: number;
  }>;

  // Redistribution from caps
  redistributedUsd: number;
}

/**
 * Calculate monthly pool distribution
 *
 * @param ownerPoints Map of owner ID to their monthly points
 * @param totalPoolUsd Total USD in the pool for the month
 */
export function calculatePoolDistribution(
  ownerPoints: Map<string, OwnerMonthlyPoints>,
  totalPoolUsd: number,
): PoolDistribution {
  // Step 1: Calculate total network points (respecting MAX_CARS_PER_OWNER)
  let totalNetworkPoints = 0;
  const ownerEffectivePoints = new Map<string, number>();

  for (const [ownerId, ownerData] of ownerPoints) {
    // Sort cars by points descending, take top MAX_CARS_PER_OWNER
    const sortedCars = [...ownerData.carPoints].sort((a, b) => b.points - a.points);
    const eligibleCars = sortedCars.slice(0, MAX_CARS_PER_OWNER);
    const effectivePoints = eligibleCars.reduce((sum, car) => sum + car.points, 0);

    ownerEffectivePoints.set(ownerId, effectivePoints);
    totalNetworkPoints += effectivePoints;
  }

  if (totalNetworkPoints === 0) {
    return {
      month: new Date().toISOString().slice(0, 7),
      totalPoolUsd,
      totalPointsNetwork: 0,
      pointValueUsd: 0,
      ownerShares: [],
      redistributedUsd: 0,
    };
  }

  // Step 2: Calculate raw shares
  const rawShares = new Map<string, number>();
  for (const [ownerId, points] of ownerEffectivePoints) {
    rawShares.set(ownerId, points / totalNetworkPoints);
  }

  // Step 3: Apply MAX_POOL_SHARE_PER_OWNER cap
  let totalCapped = 0;
  const cappedShares = new Map<string, number>();

  for (const [ownerId, rawShare] of rawShares) {
    const cappedShare = Math.min(rawShare, MAX_POOL_SHARE_PER_OWNER);
    cappedShares.set(ownerId, cappedShare);

    if (rawShare > MAX_POOL_SHARE_PER_OWNER) {
      totalCapped += rawShare - MAX_POOL_SHARE_PER_OWNER;
    }
  }

  // Step 4: Redistribute capped amounts proportionally to uncapped owners
  const uncappedOwners = [...cappedShares.entries()].filter(
    ([, share]) => share < MAX_POOL_SHARE_PER_OWNER,
  );
  const totalUncappedShare = uncappedOwners.reduce((sum, [, share]) => sum + share, 0);

  if (totalCapped > 0 && totalUncappedShare > 0) {
    for (const [ownerId, share] of uncappedOwners) {
      const redistributionShare = (share / totalUncappedShare) * totalCapped;
      const newShare = Math.min(share + redistributionShare, MAX_POOL_SHARE_PER_OWNER);
      cappedShares.set(ownerId, newShare);
    }
  }

  // Step 5: Calculate payouts
  const pointValueUsd = totalPoolUsd / totalNetworkPoints;
  const redistributedUsd = totalCapped * totalPoolUsd;

  const ownerShares = [...ownerPoints.entries()].map(([ownerId, ownerData]) => {
    const rawShare = rawShares.get(ownerId) ?? 0;
    const cappedShare = cappedShares.get(ownerId) ?? 0;
    const pointsUsed = ownerEffectivePoints.get(ownerId) ?? 0;

    return {
      ownerId,
      rawShare,
      cappedShare,
      payoutUsd: Math.round(cappedShare * totalPoolUsd * 100) / 100,
      pointsUsed,
      carCount: Math.min(ownerData.carPoints.length, MAX_CARS_PER_OWNER),
    };
  });

  return {
    month: new Date().toISOString().slice(0, 7),
    totalPoolUsd,
    totalPointsNetwork: totalNetworkPoints,
    pointValueUsd: Math.round(pointValueUsd * 10000) / 10000,
    ownerShares: ownerShares.sort((a, b) => b.payoutUsd - a.payoutUsd),
    redistributedUsd: Math.round(redistributedUsd * 100) / 100,
  };
}

// ============================================================================
// ANTI-GAMING DETECTION
// ============================================================================

/**
 * Gaming signal types
 */
export type GamingSignal =
  // Original signals
  | 'calendar_open_no_bookings' // Open calendar but 0 bookings (+20)
  | 'high_rejection_rate' // Rejects most requests (+30)
  | 'price_manipulation' // Price changes frequently to avoid bookings (+15)
  | 'fake_bookings_suspected' // Bookings with same users repeatedly (+40)
  | 'multi_account_suspected' // Multiple accounts same device/payment (+35)
  | 'rapid_cancellation_pattern' // Cancels to cherry-pick bookings (+25)
  // Tier 2 signals
  | 'listing_velocity' // 4+ cars added in 30 days (+20)
  | 'cross_account_collusion' // 2+ accounts share phone/payment method (+35)
  | 'synthetic_availability' // 5+ requests, 0 accepted, 3+ rejected (+25)
  | 'review_manipulation' // 70%+ 5-star reviews from new accounts (+30)
  | 'geographic_anomaly'; // Car 500+km from owner address (+15)

/**
 * Gaming detection result
 */
export interface GamingDetection {
  ownerId: string;
  signals: GamingSignal[];
  riskScore: number; // 0-100
  recommendation: 'none' | 'warn' | 'review' | 'suspend';
  details: string[];
}

/**
 * Extended gaming detection input (Tier 2)
 */
export interface GamingDetectionInput {
  ownerId: string;
  // Original metrics
  vaDays30d: number;
  bookings30d: number;
  rejections30d: number;
  cancellations30d: number;
  uniqueRenters90d: number;
  totalBookings90d: number;
  priceChanges30d: number;
  // Tier 2 metrics
  carsAdded30d: number;
  sharesPhoneOrPayment: boolean; // cross-account collusion flag
  fiveStarFromNewAccounts: number; // count of 5-star reviews from accounts < 30d old
  totalReviews: number;
  carDistanceFromOwnerKm: number; // max distance of any car from owner address
}

/**
 * Detect potential gaming behavior (v2 — includes Tier 2 signals)
 */
export function detectGaming(input: GamingDetectionInput): GamingDetection {
  const signals: GamingSignal[] = [];
  const details: string[] = [];
  let riskScore = 0;

  // Signal 1: Calendar open but no bookings (+20)
  if (input.vaDays30d >= 20 && input.bookings30d === 0) {
    signals.push('calendar_open_no_bookings');
    details.push(`${input.vaDays30d} VA days but 0 bookings`);
    riskScore += 20;
  }

  // Signal 2: High rejection rate (+30)
  const totalRequests = input.bookings30d + input.rejections30d;
  if (totalRequests >= 5) {
    const rejectionRate = input.rejections30d / totalRequests;
    if (rejectionRate > 0.5) {
      signals.push('high_rejection_rate');
      details.push(`${Math.round(rejectionRate * 100)}% rejection rate`);
      riskScore += 30;
    }
  }

  // Signal 3: Price manipulation (+15)
  if (input.priceChanges30d > 10) {
    signals.push('price_manipulation');
    details.push(`${input.priceChanges30d} price changes in 30 days`);
    riskScore += 15;
  }

  // Signal 4: Fake bookings (same renters) (+40)
  if (input.totalBookings90d >= 5 && input.uniqueRenters90d <= 2) {
    signals.push('fake_bookings_suspected');
    details.push(`${input.totalBookings90d} bookings with only ${input.uniqueRenters90d} unique renters`);
    riskScore += 40;
  }

  // Signal 5: Rapid cancellation pattern (+25)
  if (input.cancellations30d >= 3) {
    signals.push('rapid_cancellation_pattern');
    details.push(`${input.cancellations30d} owner cancellations in 30 days`);
    riskScore += 25;
  }

  // Signal 6 (Tier 2): Listing velocity (+20)
  if (input.carsAdded30d >= 4) {
    signals.push('listing_velocity');
    details.push(`${input.carsAdded30d} cars added in 30 days`);
    riskScore += 20;
  }

  // Signal 7 (Tier 2): Cross-account collusion (+35)
  if (input.sharesPhoneOrPayment) {
    signals.push('cross_account_collusion');
    details.push('Shares phone or payment method with another account');
    riskScore += 35;
  }

  // Signal 8 (Tier 2): Synthetic availability (+25)
  if (totalRequests >= 5 && input.bookings30d === 0 && input.rejections30d >= 3) {
    signals.push('synthetic_availability');
    details.push(`${totalRequests} requests, 0 accepted, ${input.rejections30d} rejected`);
    riskScore += 25;
  }

  // Signal 9 (Tier 2): Review manipulation (+30)
  // Triple gate: totalReviews >= 12 AND fiveStarFromNew >= 8 AND ratio >= 70%
  // Each condition eliminates a different false positive type:
  // - totalReviews: new owners with few reviews
  // - absolute count: edge cases near threshold
  // - ratio: legitimate owners with some new-account reviews
  const totalReviews = Math.max(0, input.totalReviews ?? 0);
  const fiveStarFromNew = Math.max(0, input.fiveStarFromNewAccounts ?? 0);
  const fiveStarFromNewClamped = Math.min(fiveStarFromNew, totalReviews);

  const MIN_TOTAL_REVIEWS_FOR_SIGNAL = 12;
  const MIN_NEW_ACCOUNT_5STAR_COUNT = 8;
  const NEW_ACCOUNT_5STAR_RATIO_THRESHOLD = 0.7;

  if (totalReviews >= MIN_TOTAL_REVIEWS_FOR_SIGNAL && fiveStarFromNewClamped >= MIN_NEW_ACCOUNT_5STAR_COUNT) {
    const ratio = fiveStarFromNewClamped / totalReviews;
    if (ratio >= NEW_ACCOUNT_5STAR_RATIO_THRESHOLD) {
      signals.push('review_manipulation');
      details.push(
        `${fiveStarFromNewClamped}/${totalReviews} (${Math.round(ratio * 100)}%) 5★ reviews from accounts <30d old`
      );
      riskScore += 30;
    }
  }

  // Signal 10 (Tier 2): Geographic anomaly (+15)
  if (input.carDistanceFromOwnerKm > 500) {
    signals.push('geographic_anomaly');
    details.push(`Car located ${Math.round(input.carDistanceFromOwnerKm)}km from owner address`);
    riskScore += 15;
  }

  // Compound risk: 3+ simultaneous signals add bonus
  if (signals.length >= 3) {
    const compoundBonus = Math.min(20, (signals.length - 2) * 10);
    details.push(`Compound risk: ${signals.length} simultaneous signals (+${compoundBonus})`);
    riskScore += compoundBonus;
  }

  // Determine recommendation
  let recommendation: GamingDetection['recommendation'] = 'none';
  if (riskScore >= 60) {
    recommendation = 'suspend';
  } else if (riskScore >= 40) {
    recommendation = 'review';
  } else if (riskScore >= 20) {
    recommendation = 'warn';
  }

  return {
    ownerId: input.ownerId,
    signals,
    riskScore: Math.min(100, riskScore),
    recommendation,
    details,
  };
}

// ============================================================================
// ELIGIBILITY CHECK
// ============================================================================

/**
 * Check if an owner is eligible for reward pool
 */
export interface EligibilityCheck {
  ownerId: string;
  isEligible: boolean;
  reasons: string[];
  requirements: {
    kycVerified: { required: boolean; met: boolean };
    minVaDays: { required: number; actual: number; met: boolean };
    noActiveSuspension: { required: boolean; met: boolean };
    gamingRiskOk: { maxRisk: number; actual: number; met: boolean };
  };
}

export function checkEligibility(
  ownerId: string,
  isKycVerified: boolean,
  vaDaysThisMonth: number,
  hasActiveSuspension: boolean,
  gamingRiskScore: number,
): EligibilityCheck {
  const requirements = {
    kycVerified: {
      required: true,
      met: isKycVerified,
    },
    minVaDays: {
      required: MIN_VA_DAYS_FOR_ELIGIBILITY,
      actual: vaDaysThisMonth,
      met: vaDaysThisMonth >= MIN_VA_DAYS_FOR_ELIGIBILITY,
    },
    noActiveSuspension: {
      required: true,
      met: !hasActiveSuspension,
    },
    gamingRiskOk: {
      maxRisk: 40,
      actual: gamingRiskScore,
      met: gamingRiskScore < 40,
    },
  };

  const reasons: string[] = [];
  if (!requirements.kycVerified.met) reasons.push('KYC not verified');
  if (!requirements.minVaDays.met)
    reasons.push(`Only ${vaDaysThisMonth} VA days (min ${MIN_VA_DAYS_FOR_ELIGIBILITY})`);
  if (!requirements.noActiveSuspension.met) reasons.push('Account suspended');
  if (!requirements.gamingRiskOk.met) reasons.push(`Gaming risk too high (${gamingRiskScore})`);

  return {
    ownerId,
    isEligible: reasons.length === 0,
    reasons,
    requirements,
  };
}

// ============================================================================
// HELPERS FOR UI
// ============================================================================

/**
 * Format points for display
 */
export function formatPoints(points: number): string {
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}k`;
  }
  return points.toString();
}

/**
 * Get factor quality label
 */
export function getFactorQuality(factor: number, type: 'value' | 'rep' | 'demand'): string {
  if (type === 'value') {
    if (factor >= 2.0) return 'Premium';
    if (factor >= 1.5) return 'Above Average';
    if (factor >= 1.0) return 'Standard';
    return 'Entry';
  }

  if (type === 'rep') {
    if (factor >= 1.1) return 'Excellent';
    if (factor >= 1.0) return 'Good';
    if (factor >= 0.9) return 'Average';
    if (factor >= 0.8) return 'Below Average';
    return 'Poor';
  }

  if (type === 'demand') {
    if (factor >= 1.2) return 'High Demand';
    if (factor >= 1.0) return 'Normal Demand';
    if (factor >= 0.9) return 'Low Demand';
    return 'Very Low Demand';
  }

  return 'Unknown';
}

/**
 * Estimate monthly earnings for a car
 */
export function estimateMonthlyEarnings(
  dailyPoints: number,
  daysInMonth: number,
  estimatedPoolUsd: number,
  estimatedNetworkPoints: number,
): { estimatedUsd: number; estimatedShare: number } {
  const monthlyPoints = dailyPoints * daysInMonth;
  const estimatedShare = estimatedNetworkPoints > 0 ? monthlyPoints / estimatedNetworkPoints : 0;
  const estimatedUsd = Math.round(estimatedShare * estimatedPoolUsd * 100) / 100;

  return { estimatedUsd, estimatedShare };
}

// ============================================================================
// REFERENCE TABLE
// ============================================================================

/**
 * Generate complete reference table for documentation
 */
export function generateReferenceTable(): {
  valueFactors: Array<{ valueUsd: number; factor: number }>;
  repFactors: Array<{ rating: number; reviews: number; factor: number }>;
  demandFactors: Array<{ demandIndex: number; factor: number }>;
  exampleCalculations: Array<{
    scenario: string;
    basePoints: number;
    va: number;
    valueFactor: number;
    repFactor: number;
    demandFactor: number;
    totalPoints: number;
  }>;
} {
  return {
    valueFactors: getValueFactorTable(),

    repFactors: [
      { rating: 5.0, reviews: 50, factor: calculateRepFactor(5.0, 50, 0) },
      { rating: 4.5, reviews: 20, factor: calculateRepFactor(4.5, 20, 0) },
      { rating: 4.0, reviews: 10, factor: calculateRepFactor(4.0, 10, 0) },
      { rating: 4.0, reviews: 0, factor: calculateRepFactor(null, 0, 0) }, // New owner
      { rating: 3.5, reviews: 5, factor: calculateRepFactor(3.5, 5, 0) },
      { rating: 3.0, reviews: 10, factor: calculateRepFactor(3.0, 10, 0) },
      { rating: 4.0, reviews: 10, factor: calculateRepFactor(4.0, 10, 2) }, // With cancellations
    ],

    demandFactors: [
      { demandIndex: 0.3, factor: calculateDemandFactor(300, 0, 1000) },
      { demandIndex: 0.5, factor: calculateDemandFactor(500, 0, 1000) },
      { demandIndex: 1.0, factor: calculateDemandFactor(1000, 0, 1000) },
      { demandIndex: 1.5, factor: calculateDemandFactor(1500, 0, 1000) },
      { demandIndex: 2.0, factor: calculateDemandFactor(2000, 0, 1000) },
    ],

    exampleCalculations: [
      {
        scenario: 'Corolla $15k, good rep, normal demand',
        basePoints: 100,
        va: 1,
        valueFactor: 1.0,
        repFactor: 1.0,
        demandFactor: 1.0,
        totalPoints: 100,
      },
      {
        scenario: 'Corolla $15k, excellent rep, high demand',
        basePoints: 100,
        va: 1,
        valueFactor: 1.0,
        repFactor: 1.15,
        demandFactor: 1.2,
        totalPoints: 138,
      },
      {
        scenario: 'BMW $70k, good rep, normal demand',
        basePoints: 100,
        va: 1,
        valueFactor: 2.27,
        repFactor: 1.0,
        demandFactor: 1.0,
        totalPoints: 227,
      },
      {
        scenario: 'Cronos $12k, low rep, low demand',
        basePoints: 100,
        va: 1,
        valueFactor: 0.89,
        repFactor: 0.85,
        demandFactor: 0.85,
        totalPoints: 64,
      },
      {
        scenario: 'Any car, VA=0 (rejected requests)',
        basePoints: 100,
        va: 0,
        valueFactor: 1.5,
        repFactor: 1.0,
        demandFactor: 1.0,
        totalPoints: 0,
      },
    ],
  };
}
