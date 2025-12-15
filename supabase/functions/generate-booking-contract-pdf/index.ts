import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface GeneratePdfRequest {
  booking_id: string;
  merged_html: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[generate-booking-contract-pdf] Function invoked');

    // ========================================
    // 1. AUTHENTICATION
    // ========================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user auth
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Create service role client for storage operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    console.log(`[generate-booking-contract-pdf] User authenticated: ${user.id}`);

    // ========================================
    // 2. PARSE REQUEST BODY
    // ========================================
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: GeneratePdfRequest = await req.json();
    const { booking_id, merged_html } = body;

    if (!booking_id || !merged_html) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: booking_id and merged_html',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[generate-booking-contract-pdf] Processing booking: ${booking_id}`);

    // ========================================
    // 3. VALIDATE BOOKING ACCESS
    // ========================================
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, renter_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found or access denied' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify user is the renter
    if (booking.renter_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Only the renter can generate contract PDF' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // ========================================
    // 4. UPDATE CONTRACT STATUS TO 'GENERATING'
    // ========================================
    await supabaseAdmin.from('booking_contracts').update({
      pdf_generation_status: 'generating',
    }).eq('booking_id', booking_id);

    // ========================================
    // 5. GENERATE PDF WITH PUPPETEER
    // ========================================
    console.log('[generate-booking-contract-pdf] Launching Puppeteer...');
    const startTime = Date.now();

    let browser;
    let pdfBuffer: Uint8Array;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
        ],
      });

      const page = await browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({ width: 1200, height: 1600 });

      // Load HTML content
      await page.setContent(merged_html, {
        waitUntil: 'networkidle0',
        timeout: 15000, // 15s timeout
      });

      // Generate PDF
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
        preferCSSPageSize: false,
      });

      await browser.close();

      const elapsedTime = Date.now() - startTime;
      console.log(`[generate-booking-contract-pdf] PDF generated in ${elapsedTime}ms`);
    } catch (puppeteerError) {
      console.error('[generate-booking-contract-pdf] Puppeteer error:', puppeteerError);

      // Update contract with error status
      await supabaseAdmin.from('booking_contracts').update({
        pdf_generation_status: 'failed',
        pdf_error: String(puppeteerError),
      }).eq('booking_id', booking_id);

      throw new Error(`PDF generation failed: ${puppeteerError}`);
    }

    // ========================================
    // 6. UPLOAD PDF TO STORAGE
    // ========================================
    const fileName = `contracts/${booking_id}-${Date.now()}.pdf`;

    console.log(`[generate-booking-contract-pdf] Uploading to storage: ${fileName}`);

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('booking-contracts')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('[generate-booking-contract-pdf] Storage upload error:', uploadError);

      // Update contract with error status
      await supabaseAdmin.from('booking_contracts').update({
        pdf_generation_status: 'failed',
        pdf_error: `Storage upload failed: ${uploadError.message}`,
      }).eq('booking_id', booking_id);

      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('[generate-booking-contract-pdf] PDF uploaded successfully');

    // ========================================
    // 7. CREATE SIGNED URL (7 days validity)
    // ========================================
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from('booking-contracts')
      .createSignedUrl(fileName, 7 * 24 * 60 * 60); // 7 days

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('[generate-booking-contract-pdf] Signed URL error:', signedUrlError);

      // Update contract with error status
      await supabaseAdmin.from('booking_contracts').update({
        pdf_generation_status: 'failed',
        pdf_error: `Signed URL creation failed: ${signedUrlError?.message}`,
      }).eq('booking_id', booking_id);

      throw new Error(`Signed URL creation failed: ${signedUrlError?.message}`);
    }

    const signedUrl = signedUrlData.signedUrl;

    console.log('[generate-booking-contract-pdf] Signed URL created');

    // ========================================
    // 8. UPDATE BOOKING_CONTRACTS RECORD
    // ========================================
    const { error: updateError } = await supabaseAdmin
      .from('booking_contracts')
      .update({
        pdf_url: signedUrl,
        pdf_storage_path: fileName,
        pdf_generated_at: new Date().toISOString(),
        pdf_generation_status: 'ready',
        pdf_error: null, // Clear any previous errors
      })
      .eq('booking_id', booking_id);

    if (updateError) {
      console.error('[generate-booking-contract-pdf] Update error:', updateError);
      throw new Error(`Failed to update contract record: ${updateError.message}`);
    }

    console.log('[generate-booking-contract-pdf] Contract record updated successfully');

    // ========================================
    // 9. RETURN SUCCESS RESPONSE
    // ========================================
    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: signedUrl,
        file_name: fileName,
        booking_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[generate-booking-contract-pdf] Unexpected error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
