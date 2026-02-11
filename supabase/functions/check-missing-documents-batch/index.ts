// ============================================================================
// CHECK MISSING DOCUMENTS BATCH - Supabase Edge Function
// Optimized batch query to check missing vehicle documents (N+1 → 1 query)
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface CarDocumentStatus {
  car_id: string;
  car_title: string;
  plate: string | null;
  missing_documents: string[];
  expiring_soon: string[]; // Within 30 days
  expired: string[];
  status: 'ok' | 'warning' | 'critical';
}

interface BatchResponse {
  cars: CarDocumentStatus[];
  summary: {
    total_cars: number;
    cars_with_issues: number;
    total_missing: number;
    total_expiring: number;
    total_expired: number;
  };
  checked_at: string;
}

// Required document types for a car to be rentable
const REQUIRED_DOCUMENTS = [
  'cedula_verde',
  'cedula_azul',
  'vtv',
  'seguro',
  'titulo',
];

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single optimized query: Get all cars with their documents in one shot
    const { data: carsWithDocs, error: queryError } = await supabase
      .from('cars')
      .select(`
        id,
        title,
        plate,
        vehicle_documents (
          kind,
          expires_at,
          verified
        )
      `)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('Query error:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch documents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Process each car's document status
    const carsStatus: CarDocumentStatus[] = (carsWithDocs ?? []).map((car: any) => {
      const docs = car.vehicle_documents ?? [];
      const docsByKind = new Map(docs.map((d: any) => [d.kind, d]));

      const missing: string[] = [];
      const expiringSoon: string[] = [];
      const expired: string[] = [];

      for (const requiredDoc of REQUIRED_DOCUMENTS) {
        const doc = docsByKind.get(requiredDoc);

        if (!doc || !doc.verified) {
          missing.push(requiredDoc);
        } else if (doc.expires_at) {
          const expiresAt = new Date(doc.expires_at);
          if (expiresAt < now) {
            expired.push(requiredDoc);
          } else if (expiresAt < thirtyDaysFromNow) {
            expiringSoon.push(requiredDoc);
          }
        }
      }

      // Determine status
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (expired.length > 0 || missing.length > 0) {
        status = 'critical';
      } else if (expiringSoon.length > 0) {
        status = 'warning';
      }

      return {
        car_id: car.id,
        car_title: car.title,
        plate: car.plate,
        missing_documents: missing,
        expiring_soon: expiringSoon,
        expired: expired,
        status,
      };
    });

    // Calculate summary
    const carsWithIssues = carsStatus.filter(c => c.status !== 'ok').length;
    const totalMissing = carsStatus.reduce((sum, c) => sum + c.missing_documents.length, 0);
    const totalExpiring = carsStatus.reduce((sum, c) => sum + c.expiring_soon.length, 0);
    const totalExpired = carsStatus.reduce((sum, c) => sum + c.expired.length, 0);

    const response: BatchResponse = {
      cars: carsStatus,
      summary: {
        total_cars: carsStatus.length,
        cars_with_issues: carsWithIssues,
        total_missing: totalMissing,
        total_expiring: totalExpiring,
        total_expired: totalExpired,
      },
      checked_at: now.toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=300', // 5 min cache
        }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
