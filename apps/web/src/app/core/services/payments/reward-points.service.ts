import { Injectable } from '@angular/core';

/**
 * Reward Points Calculation Service
 * 
 * Implements the core logic for the "Reward Pool" model (Option 1B).
 * Owners earn points based on asset value and availability, not direct rental income.
 */

export interface CarValueMetrics {
  marketValueUsd: number; // Valor de mercado del auto
  categoryMultiplier: number; // Multiplicador por categoría (Gama Alta = más puntos)
}

export interface AvailabilityMetrics {
  hoursAvailable: number; // Horas que el auto estuvo "listo para usar"
  peakHourMultiplier: number; // Bonus por estar disponible en hora pico
}

export interface QualityMetrics {
  ownerScore: number; // 0-100 (basado en reviews y cumplimiento)
  maintenanceScore: number; // 0-100 (estado del auto)
}

@Injectable({
  providedIn: 'root'
})
export class RewardPointsService {

  private readonly BASE_POINT_VALUE = 100; // Puntos base por día
  
  /**
   * Calcula los puntos diarios generados por un vehículo
   * Fórmula: (Valor * Disponibilidad * Calidad)
   */
  calculateDailyPoints(
    car: CarValueMetrics,
    availability: AvailabilityMetrics,
    quality: QualityMetrics
  ): number {
    
    // 1. Factor de Activo (Asset Factor)
    // Un auto de $20k genera el doble de puntos base que uno de $10k
    const assetFactor = (car.marketValueUsd / 10000) * car.categoryMultiplier;

    // 2. Factor de Tiempo (Time Factor)
    // 24h disponible = 1.0
    const timeFactor = (availability.hoursAvailable / 24) * availability.peakHourMultiplier;

    // 3. Factor de Calidad (Quality Factor)
    // Score 100 = 1.0, Score 50 = 0.5
    const qualityFactor = ((quality.ownerScore + quality.maintenanceScore) / 2) / 100;

    // Cálculo Final
    const totalPoints = this.BASE_POINT_VALUE * assetFactor * timeFactor * qualityFactor;

    return Math.round(totalPoints * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * Estima el Share del Pool (Porcentaje del total)
   */
  estimatePoolShare(myPoints: number, totalPoolPoints: number): number {
    if (totalPoolPoints === 0) return 0;
    return (myPoints / totalPoolPoints) * 100;
  }
}
