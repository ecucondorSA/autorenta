import { serve } from "bun";

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    const noCacheHeaders = {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    };

    // Root -> Serve index-pt.html for Portuguese version
    if (path === "/") {
      let html = await Bun.file("./index-pt.html").text();
      // Cache bust CSS
      html = html.replace('.css', '.css?t=' + Date.now());
      return new Response(html, { headers: { "Content-Type": "text/html", ...noCacheHeaders } });
    }

    // App-pt.js -> Serve from compiled version
    if (path === "/src/App-pt.tsx") {
      return new Response(Bun.file("./src/App-pt.tsx"), { 
        headers: { "Content-Type": "text/typescript", ...noCacheHeaders } 
      });
    }

    // Serve assets from original assets folder
    if (path.startsWith("/assets/")) {
      return new Response(Bun.file("." + path), { headers: noCacheHeaders });
    }

    // Serve bundled assets from out folder
    const outFile = Bun.file("./out" + path);
    if (await outFile.exists()) {
      return new Response(outFile, { headers: noCacheHeaders });
    }

    // Fallback: try relative to root
    const rootFile = Bun.file("." + path);
    if (await rootFile.exists()) {
      return new Response(rootFile, { headers: noCacheHeaders });
    }

    return new Response("Not found: " + path, { status: 404 });
  },
});

console.log("Pitchdeck PT server running at http://localhost:3000 (Português)");