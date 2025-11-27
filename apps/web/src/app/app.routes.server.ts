import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Server-side rendering configuration for routes
 *
 * RenderMode options:
 * - Prerender: Built at compile time (disabled - causes timeout with Supabase init)
 * - Server: Rendered on each request (for SEO-critical pages)
 * - Client: Client-side only (default for SPA behavior)
 *
 * Note: Prerender disabled because app bootstrap initializes Supabase
 * which causes timeouts during build. SSR on-demand works fine.
 */
export const serverRoutes: ServerRoute[] = [
  // SEO-critical pages - SSR on each request
  // Home, explore, landing pages get full SSR for search engines
  {
    path: '',
    renderMode: RenderMode.Server,
  },
  {
    path: 'explore',
    renderMode: RenderMode.Server,
  },
  {
    path: 'become-renter',
    renderMode: RenderMode.Server,
  },
  {
    path: 'terminos',
    renderMode: RenderMode.Server,
  },
  {
    path: 'politica-seguros',
    renderMode: RenderMode.Server,
  },
  {
    path: 'cars/:id',
    renderMode: RenderMode.Server,
  },

  // All other routes - client-side rendering
  // Protected routes, dashboards, user-specific content
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
