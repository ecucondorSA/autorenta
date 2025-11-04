
import { ChatMessageInsertSchema } from '../../../../../../functions/contracts/chat-message.schemas';
import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Mock for queueOffline
const queueOffline = (data: any) => {
  console.log('Queuing offline:', data);
};

export async function insertMessage(supabase: SupabaseClient, input: any) {
  try {
    // Strip full_name before validation (UI might send it but DB doesn't need it)
    const { full_name, ...rest } = input;
    const clean = ChatMessageInsertSchema.parse(rest);
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
