
import { test, expect } from '@playwright/test';
import { transferResponseSchema } from '../../functions/contracts/wallet-transfer.contracts';

test('API contract for POST /api/v1/wallet/transfer should be valid', async ({ request }) => {
  const validPayload = {
    source_account_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    target_account_id: 'f1e2d3c4-b5a6-7890-1234-567890fedcba',
    amount_cents: 10000,
    memo: 'E2E Contract Test',
  };

  const response = await request.post('/api/v1/wallet/transfer', { data: validPayload });

  expect(response.status()).toBe(200);

  const jsonResponse = await response.json();

  // This will throw an error if the response does not match the schema
  const validationResult = transferResponseSchema.safeParse(jsonResponse);

  expect(validationResult.success).toBe(true);
});
