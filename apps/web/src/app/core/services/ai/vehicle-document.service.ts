import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from '@core/services/supabase.service';

/**
 * Vehicle Document Verification Service
 *
 * Uses Gemini Vision to verify vehicle documents (registration, title, insurance).
 * Extracts key information and validates consistency with vehicle data.
 */

export interface VerifyDocumentRequest {
  image_url: string;
  document_type: 'registration' | 'title' | 'insurance' | 'inspection' | 'permit';
  vehicle_data?: {
    plate?: string;
    brand?: string;
    model?: string;
    year?: number;
    vin?: string;
  };
}

export interface ExtractedDocumentData {
  plate?: string;
  brand?: string;
  model?: string;
  year?: number;
  vin?: string;
  owner_name?: string;
  expiration_date?: string;
  document_number?: string;
  [key: string]: string | number | undefined;
}

export interface DocumentValidation {
  is_readable: boolean;
  is_complete: boolean;
  is_expired: boolean;
  matches_vehicle: boolean;
  discrepancies: string[];
}

export interface DocumentVerificationResult {
  success: boolean;
  is_valid: boolean;
  document_type_detected: string;
  extracted_data: ExtractedDocumentData;
  validation: DocumentValidation;
  confidence: number;
  warnings: string[];
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class VehicleDocumentService {
  private readonly supabase = inject(SupabaseService);

  // State
  readonly isVerifying = signal(false);
  readonly lastResult = signal<DocumentVerificationResult | null>(null);
  readonly error = signal<string | null>(null);

  // Computed
  readonly isDocumentValid = computed(() => this.lastResult()?.is_valid ?? false);
  readonly extractedData = computed(() => this.lastResult()?.extracted_data ?? {});
  readonly discrepancies = computed(() => this.lastResult()?.validation.discrepancies ?? []);

  /**
   * Verify a vehicle document using AI
   */
  async verifyDocument(request: VerifyDocumentRequest): Promise<DocumentVerificationResult> {
    this.isVerifying.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client.functions.invoke<DocumentVerificationResult>(
        'verify-vehicle-document',
        { body: request }
      );

      if (error) throw error;

      const result = data!;
      this.lastResult.set(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al verificar documento';
      this.error.set(message);
      throw err;
    } finally {
      this.isVerifying.set(false);
    }
  }

  /**
   * Verify vehicle registration card
   */
  async verifyRegistration(imageUrl: string, vehicleData?: VerifyDocumentRequest['vehicle_data']): Promise<DocumentVerificationResult> {
    return this.verifyDocument({
      image_url: imageUrl,
      document_type: 'registration',
      vehicle_data: vehicleData,
    });
  }

  /**
   * Verify insurance policy
   */
  async verifyInsurance(imageUrl: string, vehicleData?: VerifyDocumentRequest['vehicle_data']): Promise<DocumentVerificationResult> {
    return this.verifyDocument({
      image_url: imageUrl,
      document_type: 'insurance',
      vehicle_data: vehicleData,
    });
  }

  /**
   * Verify technical inspection certificate
   */
  async verifyInspection(imageUrl: string, vehicleData?: VerifyDocumentRequest['vehicle_data']): Promise<DocumentVerificationResult> {
    return this.verifyDocument({
      image_url: imageUrl,
      document_type: 'inspection',
      vehicle_data: vehicleData,
    });
  }

  /**
   * Check if document is expired based on last verification
   */
  isExpired(): boolean {
    return this.lastResult()?.validation.is_expired ?? false;
  }

  /**
   * Get expiration date from last verified document
   */
  getExpirationDate(): Date | null {
    const dateStr = this.lastResult()?.extracted_data.expiration_date;
    return dateStr ? new Date(dateStr) : null;
  }

  /**
   * Calculate days until expiration
   */
  daysUntilExpiration(): number | null {
    const expDate = this.getExpirationDate();
    if (!expDate) return null;

    const now = new Date();
    const diff = expDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Reset service state
   */
  reset(): void {
    this.lastResult.set(null);
    this.error.set(null);
  }
}
