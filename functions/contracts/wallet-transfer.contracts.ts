
import { z } from 'zod';

// ============================================================================
// INVARIANTS (Reglas de negocio explícitas)
// ============================================================================
// 1. El monto a transferir (amount_ars) debe ser siempre un número positivo.
// 2. Las cuentas de origen y destino deben ser identificadores únicos (UUID) válidos.
// 3. La cuenta de origen no puede ser la misma que la de destino.
// 4. El memo es opcional pero si se incluye debe ser un string.
// 5. El estado de la transferencia (status) solo puede ser "posted" o "pending".
// 6. La fecha de creación debe ser una fecha en formato ISO 8601 válida.

// ============================================================================
// REQUEST SCHEMA (POST /api/v1/wallet/transfer)
// ============================================================================

export const transferRequestSchema = z.object({
  source_account_id: z.string().uuid({ message: "El ID de la cuenta de origen debe ser un UUID válido." }),
  target_account_id: z.string().uuid({ message: "El ID de la cuenta de destino debe ser un UUID válido." }),
  amount_cents: z.number().int().positive({ message: "El monto debe ser un número entero positivo." }).max(10_000_000_00, { message: "El monto supera el límite máximo permitido." }),
  memo: z.string().optional(),
}).strict().refine(data => data.source_account_id !== data.target_account_id, {
  message: "La cuenta de origen y destino no pueden ser la misma.",
  path: ["target_account_id"], // Asocia el error al campo de la cuenta de destino
});

// TypeScript type inferred from the schema
export type TransferRequest = z.infer<typeof transferRequestSchema>;


// ============================================================================
// RESPONSE SCHEMA (POST /api/v1/wallet/transfer)
// ============================================================================

export const transferResponseSchema = z.object({
  transfer_id: z.string().uuid({ message: "El ID de la transferencia debe ser un UUID válido." }),
  status: z.enum(["posted", "pending"], {
    errorMap: () => ({ message: 'El estado debe ser "posted" o "pending".' }),
  }),
  created_at: z.string().datetime({ message: "La fecha de creación debe ser un string en formato ISO 8601." }),
});

// TypeScript type inferred from the schema
export type TransferResponse = z.infer<typeof transferResponseSchema>;
