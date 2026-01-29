/**
 * Credit Report Model
 *
 * Represents credit verification data from Nosis/Veraz (Argentina).
 * Used for risk assessment before approving rentals.
 */

/**
 * Document types supported for credit verification
 */
export type CreditDocumentType = 'DNI' | 'CUIT' | 'CUIL';

/**
 * Risk levels based on credit score
 */
export type CreditRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Credit report status
 */
export type CreditReportStatus = 'pending' | 'completed' | 'failed' | 'expired';

/**
 * BCRA (Central Bank) classification
 * 1 = Normal
 * 2 = Risk (with potential issues)
 * 3 = With problems
 * 4 = High insolvency risk
 * 5 = Uncollectable
 */
export type BcraStatus = '1' | '2' | '3' | '4' | '5' | null;

/**
 * Credit Report from Nosis/Veraz
 */
export interface CreditReport {
  id: string;
  user_id: string;

  // Document info
  document_type: CreditDocumentType;
  document_number: string;
  country: string;
  provider: 'nosis' | 'veraz';

  // Credit metrics
  credit_score: number | null;
  risk_level: CreditRiskLevel;
  bcra_status: BcraStatus;

  // Financial flags
  has_bounced_checks: boolean;
  bounced_checks_count: number;
  has_lawsuits: boolean;
  lawsuits_count: number;
  has_bankruptcy: boolean;
  has_tax_debt: boolean;
  has_social_security_debt: boolean;

  // Financial estimates
  estimated_monthly_income: number | null;
  estimated_annual_revenue: number | null;
  total_debt_amount: number | null;
  monthly_commitment: number | null;

  // Employment
  employer_name: string | null;
  employment_status: string | null;

  // Status
  status: CreditReportStatus;
  verified_at: string | null;
  expires_at: string | null;

  // Errors
  error_code: string | null;
  error_message: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Request to verify credit
 */
export interface CreditVerifyRequest {
  document_type: CreditDocumentType;
  document_number: string;
}

/**
 * Response from credit verification
 */
export interface CreditVerifyResponse {
  success: boolean;
  cached: boolean;
  credit_score: number | null;
  risk_level: CreditRiskLevel | null;
  bcra_status: BcraStatus;
  has_issues: boolean;
  expires_at: string | null;
  error?: string;
  message?: string;
}

/**
 * Credit eligibility check result
 */
export interface CreditEligibility {
  eligible: boolean;
  reason: string;
  credit_score: number | null;
  risk_level: CreditRiskLevel | null;
  requires_higher_deposit: boolean;
  suggested_deposit_multiplier: number;
}

/**
 * User's credit summary for display
 */
export interface CreditSummary {
  has_report: boolean;
  is_valid: boolean;
  credit_score: number | null;
  risk_level: CreditRiskLevel | null;
  risk_label: string;
  verified_at: string | null;
  expires_at: string | null;
  days_until_expiry: number | null;
  issues: string[];
}

/**
 * Get human-readable risk label
 */
export function getRiskLabel(level: CreditRiskLevel | null): string {
  switch (level) {
    case 'low':
      return 'Riesgo Bajo';
    case 'medium':
      return 'Riesgo Medio';
    case 'high':
      return 'Riesgo Alto';
    case 'critical':
      return 'Riesgo Critico';
    default:
      return 'Sin evaluar';
  }
}

/**
 * Get risk color class for UI
 */
export function getRiskColorClass(level: CreditRiskLevel | null): string {
  switch (level) {
    case 'low':
      return 'text-green-600 bg-green-100';
    case 'medium':
      return 'text-yellow-600 bg-yellow-100';
    case 'high':
      return 'text-orange-600 bg-orange-100';
    case 'critical':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

/**
 * Get BCRA status description
 */
export function getBcraDescription(status: BcraStatus): string {
  switch (status) {
    case '1':
      return 'Normal';
    case '2':
      return 'Con riesgo potencial';
    case '3':
      return 'Con problemas';
    case '4':
      return 'Alto riesgo de insolvencia';
    case '5':
      return 'Irrecuperable';
    default:
      return 'Sin informacion';
  }
}
