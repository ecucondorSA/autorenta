
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Static Routes (Manual list of your main pages)
    const staticRoutes = [
      '',
      '/explore',
      '/rentarfast',
      '/auth/login',
      '/auth/register',
      '/become-renter',
      '/help',
      '/about',
      '/careers',
      '/investors',
      '/blog' // Assuming you might have a blog later
    ];

    // 2. Dynamic Data: Fetch Active Cities
    // We use a raw query to get distinct cities from active cars
    const { data: citiesData } = await supabase
      .from('cars')
      .select('city')
      .eq('status', 'active');
    
    // De-duplicate and normalize cities
    const cities = [...new Set((citiesData || []).map((c: any) => c.city?.trim()))]
      .filter(Boolean)
      .map((city: any) => city.toLowerCase().replace(/\s+/g, '-'));

    // 3. Dynamic Data: Fetch Active Brands
    const { data: brandsData } = await supabase
      .from('cars')
      .select('brand')
      .eq('status', 'active');

    // De-duplicate and normalize brands
    const brands = [...new Set((brandsData || []).map((c: any) => c.brand?.trim()))]
      .filter(Boolean)
      .map((brand: any) => brand.toLowerCase().replace(/\s+/g, '-'));

    // 4. Build XML
    const baseUrl = 'https://autorentar.com'; // Change this to your production domain
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add Static Routes
    staticRoutes.forEach(route => {
      sitemap += `
  <url>
    <loc>${baseUrl}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    });

    // Add City Landing Pages
    cities.forEach(city => {
      sitemap += `
  <url>
    <loc>${baseUrl}/alquiler-autos/${city}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    // Add Brand Landing Pages
    brands.forEach(brand => {
      sitemap += `
  <url>
    <loc>${baseUrl}/rentar/${brand}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    sitemap += `
</urlset>`;

    return new Response(sitemap, {
      headers: corsHeaders,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
