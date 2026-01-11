/**
 * sync-fipe-prices
 *
 * Cron job que actualiza valores FIPE y precios de todos los autos activos
 * Corre mensualmente (1° de cada mes a las 3am UTC)
 *
 * Cron expression: "0 3 1 * *"
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Car {
  id: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  brand_text_backup: string | null;
  model_text_backup: string | null;
  price_override: boolean | null;
  estimated_value_usd: number | null;
}

interface FipeResponse {
  success: boolean;
  data?: {
    value_usd: number;
    value_brl?: number;
    value_ars?: number;
    fipe_code: string;
    confidence: string;
    reference_month?: string;
  };
}

// Rate limiter: max 10 requests per second to FIPE API
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req: Request) => {
  try {
    // Verify this is a cron request (basic security)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[sync-fipe-prices] Starting FIPE sync...");

    // Fetch all active cars with valid brand/model/year
    const { data: cars, error: fetchError } = await supabase
      .from("cars")
      .select("id, brand, model, year, brand_text_backup, model_text_backup, price_override, estimated_value_usd")
      .eq("status", "active")
      .not("year", "is", null)
      .order("year", { ascending: false });

    if (fetchError) {
      console.error("[sync-fipe-prices] Error fetching cars:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch cars", details: fetchError }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const results = {
      total: cars?.length || 0,
      updated: 0,
      skipped_no_data: 0,
      errors: 0,
      unchanged: 0,
      details: [] as Array<{ id: string; brand: string; model: string; status: string; old_value?: number; new_value?: number }>
    };

    for (const car of cars || []) {
      // Prioritize *_text_backup because it has full FIPE names (e.g., "Corolla Altis 1.8 16V")
      // Regular fields may be simplified (e.g., just "Corolla")
      const brand = car.brand_text_backup || car.brand;
      const model = car.model_text_backup || car.model;

      // Skip if brand/model missing
      if (!brand || !model) {
        results.skipped_no_data++;
        results.details.push({
          id: car.id,
          brand: brand || "(null)",
          model: model || "(null)",
          status: "skipped_no_data"
        });
        continue;
      }

      try {
        // Call get-fipe-value function
        const fipeResponse = await fetch(
          `${supabaseUrl}/functions/v1/get-fipe-value`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({
              brand,
              model,
              year: car.year,
              country: "AR"
            })
          }
        );

        const fipe: FipeResponse = await fipeResponse.json();

        // Debug logging
        if (!fipe.success) {
          console.log(`[sync-fipe-prices] FIPE failed for ${brand} ${model} ${car.year}:`, fipe);
        }

        if (fipe.success && fipe.data?.value_usd) {
          const newValue = fipe.data.value_usd;
          const oldValue = car.estimated_value_usd;

          const isChanged = oldValue !== null && oldValue !== newValue;

          if (oldValue !== null && oldValue === newValue) {
            results.unchanged++;
            results.details.push({
              id: car.id,
              brand,
              model,
              status: "unchanged",
              old_value: oldValue,
              new_value: newValue
            });
            const { error: historyError } = await supabase
              .from("cars_fipe_history")
              .insert({
                car_id: car.id,
                synced_at: new Date().toISOString(),
                value_usd: newValue,
                value_brl: fipe.data.value_brl ?? null,
                value_ars: fipe.data.value_ars ?? null,
                fipe_code: fipe.data.fipe_code || null,
                reference_month: fipe.data.reference_month || null,
                source: "fipe",
                is_changed: false,
                previous_value_usd: oldValue
              });
            if (historyError) {
              console.error(`[sync-fipe-prices] Error inserting history for car ${car.id}:`, historyError);
            }
          } else {
            // Update estimated_value_usd (trigger will auto-update price_per_day)
            const { error: updateError } = await supabase
              .from("cars")
              .update({
                estimated_value_usd: newValue,
                value_usd: newValue,
                value_usd_source: "fipe",
                fipe_code: fipe.data.fipe_code || null,
                fipe_last_sync: new Date().toISOString(),
                brand: brand, // Ensure main fields are populated
                model: model,
                updated_at: new Date().toISOString()
              })
              .eq("id", car.id);

              if (updateError) {
                console.error(`[sync-fipe-prices] Error updating car ${car.id}:`, updateError);
                results.errors++;
                results.details.push({
                  id: car.id,
                  brand,
                  model,
                  status: "error",
                  old_value: oldValue || 0,
                  new_value: newValue
                });
              } else {
                results.updated++;
                results.details.push({
                  id: car.id,
                  brand,
                  model,
                  status: "updated",
                  old_value: oldValue || 0,
                  new_value: newValue
                });
                const { error: historyError } = await supabase
                  .from("cars_fipe_history")
                  .insert({
                    car_id: car.id,
                    synced_at: new Date().toISOString(),
                    value_usd: newValue,
                    value_brl: fipe.data.value_brl ?? null,
                    value_ars: fipe.data.value_ars ?? null,
                    fipe_code: fipe.data.fipe_code || null,
                    reference_month: fipe.data.reference_month || null,
                    source: "fipe",
                    is_changed: isChanged,
                    previous_value_usd: oldValue
                  });
                if (historyError) {
                  console.error(`[sync-fipe-prices] Error inserting history for car ${car.id}:`, historyError);
                }
                console.log(`[sync-fipe-prices] Updated ${brand} ${model} ${car.year}: $${oldValue} → $${newValue}`);
              }
            }
        } else {
          results.skipped_no_data++;
          results.details.push({
            id: car.id,
            brand,
            model,
            status: "fipe_not_found"
          });
        }

        // Rate limiting: 100ms between requests (max 10/sec)
        await sleep(100);

      } catch (error) {
        console.error(`[sync-fipe-prices] Error processing car ${car.id}:`, error);
        results.errors++;
        results.details.push({
          id: car.id,
          brand,
          model,
          status: "exception"
        });
      }
    }

    console.log("[sync-fipe-prices] Sync complete:", {
      total: results.total,
      updated: results.updated,
      unchanged: results.unchanged,
      skipped: results.skipped_no_data,
      errors: results.errors
    });

    return new Response(
      JSON.stringify(results, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("[sync-fipe-prices] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
