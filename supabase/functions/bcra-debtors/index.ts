import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a custom fetch client that ignores SSL errors (for government APIs)
const client = Deno.createHttpClient({
  verify: false, // INSECURE: Only for specific gov endpoints known to have bad certs
});

interface BcraResponse {
  status: number;
  results: {
    identificacion: number;
    denominacion: string;
    periodos: {
      periodo: string; // "202512"
      entidades: {
        entidad: string;
        situacion: number;
        monto: number;
        diasAtrasoPago: number;
      }[];
    }[];
  } | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cuit } = await req.json();

    if (!cuit) {
      throw new Error('CUIT is required');
    }

    // Clean CUIT (remove dashes/spaces)
    const cleanCuit = cuit.replace(/\D/g, '');

    // BCRA API Endpoint
    const url = `https://api.bcra.gob.ar/centraldedeudores/v1.0/Deudas/${cleanCuit}`;

    console.log(`Fetching BCRA data for CUIT: ${cleanCuit}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      client, // Use the insecure client
    });

    if (!response.ok) {
       if (response.status === 404) {
         return new Response(JSON.stringify({ 
           status: 'clean', 
           debts: [],
           message: 'No se encontraron deudas registradas.' 
         }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
           status: 200
         });
       }
       // Log full text for debugging
       const text = await response.text();
       console.error(`BCRA API Error (${response.status}):`, text);
       throw new Error(`BCRA API Error: ${response.statusText}`);
    }

    const data: BcraResponse = await response.json();
    
    // Parse Structure: results -> periodos[] -> entidades[]
    // We usually care about the most recent period (periodos[0] usually, but let's check all just in case)
    
    let allDebts: any[] = [];
    
    if (data.results && data.results.periodos) {
      // Flatten all periods
      data.results.periodos.forEach(p => {
        if (p.entidades) {
          const debtsInPeriod = p.entidades.map(e => ({
            entity: e.entidad,
            period: p.periodo,
            situation: e.situacion,
            amount: e.monto,
            daysLate: e.diasAtrasoPago
          }));
          allDebts = allDebts.concat(debtsInPeriod);
        }
      });
    }

    // Filter to most recent period only? 
    // Usually BCRA returns history. Let's take the MAX situation across all recent history returned.
    // Or just the latest period. Let's take ALL to be safe (if they defaulted last month but not this month, it's still risky).
    
    const maxSituation = allDebts.reduce((max: number, d: any) => Math.max(max, d.situation), 1);
    const totalDebt = allDebts.reduce((sum: number, d: any) => sum + d.amount, 0);

    return new Response(JSON.stringify({
      cuit: cleanCuit,
      entity_name: data.results?.denominacion,
      max_situation: maxSituation,
      total_debt: totalDebt,
      debts_count: allDebts.length,
      debts: allDebts, // Return full list for detail if needed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error processing BCRA request:', error);
    return new Response(JSON.stringify({ error: 'Failed to process BCRA request' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});