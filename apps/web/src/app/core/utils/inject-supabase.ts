import { inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientService } from '../services/supabase-client.service';

/**
 * Helper function to inject Supabase client
 * Can be used in constructors and injection contexts
 */
export function injectSupabase(): SupabaseClient {
  const supabaseService = inject(SupabaseClientService);
  return supabaseService.getClient();
}
