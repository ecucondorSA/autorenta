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

    const baseUrl = 'https://autorentar.com';

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
      '/blog'
    ];

    // 2. Fetch Data (Parallel for performance)
    const [citiesResult, brandsResult, carsResult] = await Promise.all([
      supabase.from('cars').select('city').eq('status', 'active'),
      supabase.from('cars').select('brand').eq('status', 'active'),
      supabase.from('cars').select('id, updated_at').eq('status', 'active').order('updated_at', { ascending: false })
    ]);

    // Process Cities
    const cities = [...new Set((citiesResult.data || []).map((c: any) => c.city?.trim()))]
      .filter(Boolean)
      .map((city: any) => city.toLowerCase().replace(/\s+/g, '-'));

    // Process Brands
    const brands = [...new Set((brandsResult.data || []).map((c: any) => c.brand?.trim()))]
      .filter(Boolean)
      .map((brand: any) => brand.toLowerCase().replace(/\s+/g, '-'));

    // Process Cars
    const cars = carsResult.data || [];

    // 3. Build XML
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

    // Add Car Detail Pages
    cars.forEach((car: any) => {
      const lastMod = car.updated_at ? new Date(car.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      sitemap += `
  <url>
    <loc>${baseUrl}/cars/${car.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
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