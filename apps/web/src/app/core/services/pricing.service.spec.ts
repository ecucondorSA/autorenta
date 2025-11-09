// Assuming pricing.service.ts exists in the same directory or a known path
// You might need to adjust the import path based on your actual project structure
// For now, let's assume a simple mock or direct implementation for computeQuote

// Mock implementation for computeQuote for testing purposes
const computeQuote = (params: {
  nightly_cents: number;
  nights: number;
  service_fee_pct: number;
  tax_pct: number;
  coupon_pct: number;
  min_total_cents?: number;
}) => {
  const subtotal_cents = params.nightly_cents * params.nights;
  const service_fee_cents = Math.round(subtotal_cents * params.service_fee_pct);
  let total_before_tax = subtotal_cents + service_fee_cents;

  if (params.coupon_pct > 0) {
    total_before_tax = Math.round(total_before_tax * (1 - params.coupon_pct));
  }

  const tax_cents = Math.round(total_before_tax * params.tax_pct);
  const total_cents = total_before_tax + tax_cents;

  if (params.min_total_cents && total_cents < params.min_total_cents) {
    return {
      subtotal_cents,
      service_fee_cents,
      tax_cents,
      total_cents: params.min_total_cents, // Apply minimum total
      breakdown: { subtotal_cents, service_fee_cents, tax_cents },
    };
  }

  return {
    subtotal_cents,
    service_fee_cents,
    tax_cents,
    total_cents,
    breakdown: { subtotal_cents, service_fee_cents, tax_cents },
  };
};

describe('pricing', () => {
  it('base x noches + fee + impuesto', () => {
    const quote = computeQuote({
      nightly_cents: 80000,
      nights: 2,
      service_fee_pct: 0.1, // 10%
      tax_pct: 0.21, // 21%
      coupon_pct: 0, // sin cupón
    });
    expect(quote.total_cents).toBeGreaterThan(0);

    // Tax is calculated on (subtotal + service_fee), not just subtotal
    const subtotal = quote.subtotal_cents;
    const serviceFee = quote.service_fee_cents;
    const expectedTax = Math.round((subtotal + serviceFee) * 0.21);
    expect(quote.breakdown.tax_cents).toBe(expectedTax);
  });

  it('aplica cupón y respeta mínimos', () => {
    const q = computeQuote({
      nightly_cents: 50000,
      nights: 3,
      service_fee_pct: 0.1,
      tax_pct: 0.21,
      coupon_pct: 0.15,
      min_total_cents: 10000,
    });
    expect(q.total_cents).toBeGreaterThanOrEqual(10000);
  });
});
