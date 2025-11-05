import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';
const PLATFORM_MARGIN_PERCENT = 10.0; // 10% margin

interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

interface RateUpdateResult {
  pair: string;
  binance_rate: number;
  platform_rate: number;
  margin_absolute: number;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Currency pairs to track
    const pairs = [
      { symbol: 'USDTARS', pair: 'USDTARS' },  // Tether/Argentine Peso
      { symbol: 'USDTBRL', pair: 'USDTBRL' },  // Tether/Brazilian Real
    ];

    const results: RateUpdateResult[] = [];

    // Fetch rates from Binance for each pair
    for (const { symbol, pair } of pairs) {
      try {
        // Fetch spot price from Binance
        const response = await fetch(
          `${BINANCE_API_BASE}/ticker/price?symbol=${symbol}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
        }

        const data: BinanceTickerResponse = await response.json();
        const binanceRate = parseFloat(data.price);

        console.log(`Fetched ${pair}: ${binanceRate} from Binance`);

        // Calculate volatility (fetch 24h stats)
        let volatility24h = null;
        try {
          const statsResponse = await fetch(
            `${BINANCE_API_BASE}/ticker/24hr?symbol=${symbol}`
          );
          if (statsResponse.ok) {
            const stats = await statsResponse.json();
            const priceChangePercent = parseFloat(stats.priceChangePercent);
            volatility24h = Math.abs(priceChangePercent);
          }
        } catch (volatilityError) {
          console.warn(`Could not fetch volatility for ${pair}:`, volatilityError);
        }

        // Update database with platform margin (10%)
        const { data: updateResult, error: updateError } = await supabase.rpc(
          'upsert_exchange_rate',
          {
            p_pair: pair,
            p_binance_rate: binanceRate,
            p_margin_percent: PLATFORM_MARGIN_PERCENT,
            p_volatility_24h: volatility24h,
          }
        );

        if (updateError) {
          throw updateError;
        }

        results.push({
          pair,
          binance_rate: binanceRate,
          platform_rate: updateResult.platform_rate,
          margin_absolute: updateResult.margin_absolute,
          success: true,
        });

        console.log(
          `✅ Updated ${pair}: Binance ${binanceRate} → Platform ${updateResult.platform_rate} (+${PLATFORM_MARGIN_PERCENT}%)`
        );
      } catch (pairError) {
        console.error(`Error updating ${pair}:`, pairError);
        results.push({
          pair,
          binance_rate: 0,
          platform_rate: 0,
          margin_absolute: 0,
          success: false,
          error: pairError instanceof Error ? pairError.message : String(pairError),
        });
      }
    }

    // Check if all updates failed
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify(
        {
          success: successCount > 0,
          message: `Updated ${successCount} of ${results.length} exchange rates`,
          margin_percent: PLATFORM_MARGIN_PERCENT,
          results,
          stats: {
            success: successCount,
            failed: failureCount,
            total: results.length,
          },
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      {
        headers: { 'Content-Type': 'application/json' },
        status: successCount > 0 ? 200 : 500,
      }
    );
  } catch (error) {
    console.error('Fatal error in sync-binance-rates:', error);
    return new Response(
      JSON.stringify(
        {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
