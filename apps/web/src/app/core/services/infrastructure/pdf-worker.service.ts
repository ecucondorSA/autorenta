import { Injectable, inject } from '@angular/core';
import { environment } from '@environment';
import { ToastService } from '../ui/toast.service';
import { LoggerService } from './logger.service';

// Tipos para el Worker PDF
export type DocumentType = 'contract' | 'receipt' | 'invoice' | 'inspection';

export interface ContractPdfData {
  booking_id: string;
  booking_reference?: string;
  start_date: string;
  end_date: string;
  days_count: number;
  contribution_cents: number;
  deposit_amount_cents: number;
  insurance_cents?: number;
  fees_cents?: number;
  total_amount_cents: number;
  currency: 'USD' | 'ARS' | 'BRL';
  car: {
    title: string;
    brand: string;
    model: string;
    year: number;
    plate: string;
    color: string;
    vin?: string;
    mileage: number;
    fuel_policy?: string;
    mileage_limit?: number;
    extra_km_price?: number;
  };
  comodatario: {
    full_name: string;
    gov_id_type?: string;
    gov_id_number: string;
    driver_license_number: string;
    driver_license_expiry?: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  comodante: {
    full_name: string;
    gov_id_number?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  };
  fgo?: {
    policy_number?: string;
    liability_coverage?: number;
    deductible?: number;
  };
  pickup_address?: string;
  dropoff_address?: string;
  additional_terms?: string[];
}

export interface ReceiptPdfData {
  receipt_number: string;
  booking_id: string;
  payment_id?: string;
  payment_date: string;
  payer: {
    full_name: string;
    email: string;
    gov_id_number?: string;
  };
  amount_cents: number;
  currency: 'USD' | 'ARS' | 'BRL';
  fx_rate?: number;
  amount_local_cents?: number;
  payment_method: string;
  provider?: string;
  provider_reference?: string;
  last_four_digits?: string;
  line_items: Array<{
    description: string;
    quantity?: number;
    unit_price_cents?: number;
    amount_cents: number;
  }>;
  status: 'completed' | 'pending' | 'refunded';
}

export interface InvoicePdfData {
  invoice_number: string;
  period_id?: string;
  invoice_date: string;
  period_start: string;
  period_end: string;
  comodante: {
    full_name: string;
    gov_id_number?: string;
    email: string;
    address?: string;
    city?: string;
    country?: string;
    mercadopago_account?: string;
  };
  activity_summary?: {
    total_bookings: number;
    total_days_shared: number;
    vehicles_count: number;
  };
  points?: {
    availability: number;
    rating: number;
    seniority: number;
    referrals: number;
    response_time: number;
    participation: number;
    bonus: number;
    penalties: number;
    total: number;
  };
  gross_pool_share_cents: number;
  platform_fee_cents: number;
  fgo_contribution_cents?: number;
  net_amount_cents: number;
  currency: 'USD' | 'ARS' | 'BRL';
  line_items: Array<{
    description: string;
    amount_cents: number;
  }>;
  payment_method: string;
  payment_reference?: string;
  payment_date?: string;
}

export interface InspectionPdfData {
  inspection_id: string;
  booking_id: string;
  type: 'delivery' | 'return';
  inspection_date: string;
  inspector_name: string;
  comodatario_name: string;
  comodante_name?: string;
  car: {
    title: string;
    plate: string;
    mileage_at_inspection: number;
    fuel_level: string;
  };
  checklist: Array<{
    item: string;
    status: 'ok' | 'damaged' | 'missing' | 'na';
    notes?: string;
  }>;
  damages?: Array<{
    location: string;
    description: string;
    severity: 'minor' | 'moderate' | 'severe';
    estimated_cost_cents?: number;
    photo_url?: string;
  }>;
  photo_urls?: string[];
  comodatario_signature?: string;
  comodante_signature?: string;
  notes?: string;
}

interface PdfWorkerResponse {
  success: boolean;
  pdf_base64?: string;
  filename?: string;
  error?: string;
}

/**
 * Servicio para generar PDFs usando el Worker de Cloudflare.
 *
 * Genera documentos legales con terminología de COMODATO:
 * - Contratos de Comodato (préstamo de uso)
 * - Comprobantes de Pago
 * - Liquidación de Rewards (para comodantes)
 * - Actas de Inspección
 */
@Injectable({
  providedIn: 'root',
})
export class PdfWorkerService {
  private readonly logger = inject(LoggerService);
  private readonly toast = inject(ToastService);
  private readonly workerUrl = environment.pdfWorkerUrl;

  /**
   * Genera y descarga un Contrato de Comodato
   */
  async generateContract(data: ContractPdfData): Promise<void> {
    await this.generateAndDownload('contract', data, `contrato_${data.booking_id}.pdf`);
  }

  /**
   * Genera y descarga un Comprobante de Pago
   */
  async generateReceipt(data: ReceiptPdfData): Promise<void> {
    await this.generateAndDownload('receipt', data, `comprobante_${data.receipt_number}.pdf`);
  }

  /**
   * Genera y descarga una Liquidación de Rewards
   */
  async generateInvoice(data: InvoicePdfData): Promise<void> {
    await this.generateAndDownload('invoice', data, `liquidacion_${data.invoice_number}.pdf`);
  }

  /**
   * Genera y descarga un Acta de Inspección
   */
  async generateInspection(data: InspectionPdfData): Promise<void> {
    const tipo = data.type === 'delivery' ? 'entrega' : 'devolucion';
    await this.generateAndDownload('inspection', data, `acta_${tipo}_${data.inspection_id}.pdf`);
  }

  /**
   * Obtiene el PDF como Blob (sin descargar)
   */
  async getPdfBlob(
    type: DocumentType,
    data: ContractPdfData | ReceiptPdfData | InvoicePdfData | InspectionPdfData,
  ): Promise<Blob> {
    const response = await this.callWorker(type, data);
    if (!response.success || !response.pdf_base64) {
      throw new Error(response.error || 'Error generando PDF');
    }
    return this.base64ToBlob(response.pdf_base64);
  }

  /**
   * Abre el PDF en una nueva pestaña
   */
  async openInNewTab(
    type: DocumentType,
    data: ContractPdfData | ReceiptPdfData | InvoicePdfData | InspectionPdfData,
  ): Promise<void> {
    try {
      const blob = await this.getPdfBlob(type, data);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      // Limpiar URL después de un delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      this.logger.error('Error abriendo PDF:', error);
      this.toast.error('Error', 'No se pudo abrir el documento');
      throw error;
    }
  }

  private async generateAndDownload(
    type: DocumentType,
    data: ContractPdfData | ReceiptPdfData | InvoicePdfData | InspectionPdfData,
    filename: string,
  ): Promise<void> {
    try {
      this.toast.info('Generando', 'Preparando documento...');

      const response = await this.callWorker(type, data);

      if (!response.success || !response.pdf_base64) {
        throw new Error(response.error || 'Error generando PDF');
      }

      // Convertir base64 a blob y descargar
      const blob = this.base64ToBlob(response.pdf_base64);
      this.downloadBlob(blob, response.filename || filename);

      this.toast.success('Listo', 'Documento descargado');
      this.logger.info(`PDF generado: ${filename}`);
    } catch (error) {
      this.logger.error('Error generando PDF:', error);
      this.toast.error('Error', 'No se pudo generar el documento');
      throw error;
    }
  }

  private async callWorker(
    type: DocumentType,
    data: ContractPdfData | ReceiptPdfData | InvoicePdfData | InspectionPdfData,
  ): Promise<PdfWorkerResponse> {
    if (!this.workerUrl) {
      throw new Error('PDF Worker URL no configurada');
    }

    const response = await fetch(`${this.workerUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        data,
        options: {
          language: 'es',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Worker error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  private base64ToBlob(base64: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'application/pdf' });
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
