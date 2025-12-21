import { Injectable } from '@angular/core';
import { environment } from '@environment';

/**
 * Distance risk tier based on distance from user to car
 */
export type DistanceRiskTier = 'local' | 'regional' | 'long_distance';

/**
 * Distance calculation result with metadata
 */
export interface DistanceCalculation {
  distanceKm: number;
  tier: DistanceRiskTier;
  guaranteeMultiplier: number;
  deliveryFeeCents: number;
  message: string;
}

/**
 * Service for calculating distances and distance-based pricing/guarantees
 */
@Injectable({
  providedIn: 'root',
})
export class DistanceCalculatorService {
  private readonly EARTH_RADIUS_KM = 6371; // Earth radius in kilometers
  private readonly config = environment.distanceConfig;

  /**
   * Calculate distance between two GPS coordinates using Haversine formula
   * @param lat1 Latitude of first point
   * @param lng1 Longitude of first point
   * @param lat2 Latitude of second point
   * @param lng2 Longitude of second point
   * @returns Distance in kilometers, rounded to 2 decimal places
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distanceKm = this.EARTH_RADIUS_KM * c;

    // Round to 2 decimal places
    return Math.round(distanceKm * 100) / 100;
  }

  /**
   * Calculate full distance metadata including tier, multiplier, and delivery fee
   * @param distanceKm Distance in kilometers
   * @param baseGuaranteeUsd Base guarantee amount in USD
   * @returns Distance calculation with all metadata
   */
  calculateDistanceMetadata(
    distanceKm: number,
    _baseGuaranteeUsd: number = 300,
  ): DistanceCalculation {
    const tier = this.getDistanceTier(distanceKm);
    const guaranteeMultiplier = this.getGuaranteeMultiplier(tier);
    const deliveryFeeCents = this.calculateDeliveryFee(distanceKm);

    const messages: Record<DistanceRiskTier, string> = {
      local: 'Auto cercano - Sin recargo en garantía',
      regional: 'Distancia media - Garantía +15%',
      long_distance: 'Larga distancia - Garantía +30%',
    };

    return {
      distanceKm,
      tier,
      guaranteeMultiplier,
      deliveryFeeCents,
      message: messages[tier],
    };
  }

  /**
   * Determine distance risk tier based on distance thresholds
   * @param distanceKm Distance in kilometers
   * @returns Distance risk tier
   */
  getDistanceTier(distanceKm: number): DistanceRiskTier {
    if (distanceKm < this.config.localThresholdKm) {
      return 'local';
    } else if (distanceKm < this.config.regionalThresholdKm) {
      return 'regional';
    } else {
      return 'long_distance';
    }
  }

  /**
   * Get guarantee multiplier based on distance tier
   * @param tier Distance risk tier
   * @returns Multiplier (1.0 - 1.5)
   */
  getGuaranteeMultiplier(tier: DistanceRiskTier): number {
    // Map tier to config key (long_distance -> longDistance)
    const multipliers = this.config.guaranteeMultipliers;
    switch (tier) {
      case 'local':
        return multipliers.local;
      case 'regional':
        return multipliers.regional;
      case 'long_distance':
        return multipliers.longDistance;
    }
  }

  /**
   * Calculate delivery fee based on distance
   * Only charges if distance > minDistanceForDeliveryFee
   * @param distanceKm Distance in kilometers
   * @returns Delivery fee in cents (ARS)
   */
  calculateDeliveryFee(distanceKm: number): number {
    if (distanceKm <= this.config.minDistanceForDeliveryFee) {
      return 0;
    }

    // Fee in ARS, converted to cents
    const feeArs = distanceKm * this.config.deliveryFeePerKm;
    return Math.round(feeArs * 100);
  }

  /**
   * Check if distance is within acceptable delivery range
   * @param distanceKm Distance in kilometers
   * @returns True if distance is within max delivery range
   */
  isWithinDeliveryRange(distanceKm: number): boolean {
    return distanceKm <= this.config.maxDeliveryDistance;
  }

  /**
   * Format distance for display
   * @param distanceKm Distance in kilometers
   * @returns Formatted string (e.g., "12.5 km" or "850 m")
   */
  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      return `${meters} m`;
    } else {
      return `${distanceKm.toFixed(1)} km`;
    }
  }

  /**
   * Format delivery fee for display
   * @param feeCents Fee in cents
   * @returns Formatted string (e.g., "$150 ARS")
   */
  formatDeliveryFee(feeCents: number): string {
    const feeArs = feeCents / 100;
    return `$${feeArs.toFixed(2)} ARS`;
  }

  /**
   * Calculate distance between user location and car location
   * Convenience method that extracts coordinates from objects
   * @param userLocation User location coordinates
   * @param carLocation Car location coordinates
   * @returns Distance in kilometers, or null if coordinates are missing
   */
  calculateDistanceBetweenLocations(
    userLocation: { lat: number; lng: number } | null,
    carLocation: { lat: number; lng: number } | null,
  ): number | null {
    if (!userLocation || !carLocation) {
      return null;
    }

    return this.calculateDistance(
      userLocation.lat,
      userLocation.lng,
      carLocation.lat,
      carLocation.lng,
    );
  }

  /**
   * Check if user is near a specific location (within threshold)
   * Useful for check-in/check-out validation
   * @param userLocation User current location
   * @param targetLocation Target location (car location)
   * @param thresholdKm Maximum distance in km (default 0.5 km = 500m)
   * @returns True if user is within threshold distance
   */
  isNearLocation(
    userLocation: { lat: number; lng: number },
    targetLocation: { lat: number; lng: number },
    thresholdKm: number = 0.5,
  ): boolean {
    const distance = this.calculateDistance(
      userLocation.lat,
      userLocation.lng,
      targetLocation.lat,
      targetLocation.lng,
    );

    return distance <= thresholdKm;
  }

  /**
   * Convert degrees to radians
   * @param degrees Degrees value
   * @returns Radians value
   */
  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
