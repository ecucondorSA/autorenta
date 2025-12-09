import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Server-side rendering configuration for routes
 *
 * RenderMode options:
 * - Prerender: Built at compile time → static HTML (for Cloudflare Pages)
 * - Server: Rendered on each request (requires Node.js server)
 * - Client: Client-side only (default for SPA behavior)
 *
 * Strategy for Cloudflare Pages (static hosting):
 * - Use Prerender for SEO-critical public pages
 * - Use Client for everything else (auth-protected, dynamic content)
 *
 * NOTE: Prerendering disabled due to Angular Zone.js timeout issues during build.
 * The SSR stub client is in place for when prerendering is re-enabled.
 * To re-enable, change the paths from Client to Prerender.
 */
export const serverRoutes: ServerRoute[] = [
  // All routes use Client rendering for now
  // Prerendering will be enabled after resolving Zone.js timeout
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
