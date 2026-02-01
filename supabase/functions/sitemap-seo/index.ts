import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

console.log("Hello from Sitemap SEO Function!");

serve(async (req) => {
  try {
    // 1. Initialize Supabase Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch URLs from Database
    const { data: urls, error } = await supabase.rpc("get_all_seo_urls");

    if (error) {
      console.error("Error fetching URLs:", error);
      return new Response("Internal Server Error", { status: 500 });
    }

    if (!urls) {
      return new Response("No URLs found", { status: 404 });
    }

    // 3. Build XML Sitemap
    const baseUrl = "https://autorentar.com"; // Should ideally come from env or config
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const item of urls) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/${item.url_path}</loc>\n`;
      if (item.lastmod) {
        xml += `    <lastmod>${new Date(item.lastmod).toISOString()}</lastmod>\n`;
      }
      xml += `    <changefreq>${item.changefreq || 'weekly'}</changefreq>\n`;
      xml += `    <priority>${item.priority || 0.5}</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    // 4. Return XML Response with Caching
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=86400", // Cache for 1 hour CDN, 24h Edge
      },
    });

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
