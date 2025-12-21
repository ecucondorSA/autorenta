import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ChatMessageInsertSchema } from '../contracts/chat-message.schemas';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// Mock for queueOffline
const logger = new LoggerService();
const queueOffline = (data: unknown) => {
  logger.debug('Queuing offline', 'MessagesRepo', data);
};

type RawInsertInput = z.input<typeof ChatMessageInsertSchema> & {
  full_name?: unknown;
};

export async function insertMessage(supabase: SupabaseClient, input: unknown) {
  try {
    // Strip full_name before validation (UI might send it but DB doesn't need it)
    const payload: RawInsertInput = { ...(input as RawInsertInput) };
    if ('full_name' in payload) {
      delete payload.full_name;
    }

    const clean = ChatMessageInsertSchema.parse(payload);
    const { data, error } = await supabase.from('messages').insert(clean).select('*').single();
    if (error) {
      // 400 por esquema/columna => colar offline y reintentar luego
      if (error.code === '42703' || error.code === '42P01') {
        await queueOffline({ kind: 'message', payload: clean });
        return { kind: 'queued-offline', reason: error.code };
      }
      console.error('Error inserting message:', error);
      throw error;
    }
    return { kind: 'ok', data };
  } catch (error: unknown) {
    // This will catch Zod errors
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors);
      return { kind: 'validation-error', errors: error.errors };
    }
    throw error;
  }
}
