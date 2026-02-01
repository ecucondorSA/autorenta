import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { from, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface BcraDebt {
  entity: string;
  period: number;
  situation: number;
  amount: number;
  daysLate: number;
}

export interface BcraResult {
  cuit: string;
  max_situation: number;
  total_debt: number;
  debts: BcraDebt[];
  raw?: any;
}

@Injectable({
  providedIn: 'root'
})
export class BcraService {
  private readonly supabase = inject(SupabaseClientService);

  /**
   * Check user financial situation via BCRA (Central de Deudores)
   * Uses Edge Function 'bcra-debtors'
   */
  checkSituation(cuit: string): Observable<BcraResult> {
    if (!cuit) {
      return throwError(() => new Error('CUIT is required'));
    }

    return from(
      this.supabase.functions.invoke('bcra-debtors', {
        body: { cuit }
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          throw new Error(error.message || 'Error connecting to BCRA service');
        }
        return data as BcraResult;
      }),
      catchError(err => {
        console.error('BCRA Check Failed:', err);
        return throwError(() => err);
      })
    );
  }

  /**
   * Helper to interpret situation score
   */
  getSituationLabel(situation: number): string {
    switch (situation) {
      case 1: return 'Normal';
      case 2: return 'Riesgo Bajo';
      case 3: return 'Riesgo Medio';
      case 4: return 'Riesgo Alto';
      case 5: return 'Irrecuperable';
      case 6: return 'Irrecuperable por Disposición Técnica';
      default: return 'Desconocido';
    }
  }

  /**
   * Determines if the situation is acceptable for renting
   */
  isAcceptable(situation: number): boolean {
    return situation <= 2; // Only Normal or Low Risk
  }
}
