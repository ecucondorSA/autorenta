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
 * NOTE: Prerendering temporarily disabled due to Zone.js timeout during build.
 * All SSR-safe infrastructure is in place (stub clients, platform checks, etc.)
 * To re-enable, change specific paths from Client to Prerender.
 *
 * Known blocker: Ionic Angular or TranslateModule initialization causes timeout.
 * TODO: Investigate Ionic SSR compatibility or use zoneless rendering.
 */
export const serverRoutes: ServerRoute[] = [
  // All routes use Client rendering (SPA mode)
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
