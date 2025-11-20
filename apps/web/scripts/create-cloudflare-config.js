#!/usr/bin/env node

/**
 * Post-build script for Angular + Cloudflare Pages
 *
 * Tasks:
 * 1. Copy browser/* files to dist/web/ root (required by Cloudflare Pages)
 * 2. Create _redirects for SPA routing
 * 3. Create _headers for security & cache
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distWebPath = path.join(__dirname, '../dist/web');
const browserPath = path.join(distWebPath, 'browser');
const distPath = browserPath;

// _redirects - Cloudflare Pages SPA routing
// IMPORTANTE: Todas las rutas deben redirigir a index.html para que Angular maneje el routing
// Esto incluye /auth/callback que es crítico para OAuth
const redirectsContent = `# Cloudflare Pages - SPA Routing
# Todas las rutas de la aplicación Angular deben redirigir a index.html
# Esto permite que Angular Router maneje las rutas, incluyendo /auth/callback

# Rutas específicas de la aplicación
/auth/* /index.html 200
/cars/* /index.html 200
/bookings/* /index.html 200
/wallet/* /index.html 200
/profile/* /index.html 200
/admin/* /index.html 200
/users/* /index.html 200
/onboarding /index.html 200
/verification/* /index.html 200
/messages/* /index.html 200
/notifications/* /index.html 200
/mp-callback /index.html 200

# Fallback para todas las demás rutas (excepto archivos estáticos)
# Cloudflare Pages automáticamente excluye archivos estáticos (.js, .css, .png, etc.)
/*  /index.html  200
`;

// _headers - Headers de seguridad y cache
const headersContent = `# Headers globales de seguridad
/*
  # Prevenir clickjacking
  X-Frame-Options: DENY
  
  # Prevenir MIME-type sniffing
  X-Content-Type-Options: nosniff
  
  # Habilitar XSS protection en navegadores antiguos
  X-XSS-Protection: 1; mode=block
  
  # Política de referrer
  Referrer-Policy: strict-origin-when-cross-origin
  
  # Permissions Policy (reemplaza Feature-Policy)
  Permissions-Policy: geolocation=(self), microphone=(), camera=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
  
  # HTTP Strict Transport Security (HSTS)
  # Fuerza HTTPS por 1 año, incluye subdominios
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  
  # Content Security Policy
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://sdk.mercadopago.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://api.mercadopago.com https://*.workers.dev wss://*.supabase.co https://cloudflareinsights.com https://parallelum.com.br https://www.googleapis.com https://api.binance.com https://data-api.binance.vision; frame-src 'self' https://www.mercadopago.com https://www.mercadopago.com.ar https://sdk.mercadopago.com https://calendar.google.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://www.mercadopago.com;

# Cache para assets con hash (1 año)
/*.js
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: application/javascript; charset=utf-8

/*.css
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: text/css; charset=utf-8

# Cache para imágenes
/*.jpg
  Cache-Control: public, max-age=31536000, immutable
/*.jpeg
  Cache-Control: public, max-age=31536000, immutable
/*.png
  Cache-Control: public, max-age=31536000, immutable
/*.svg
  Cache-Control: public, max-age=31536000, immutable
/*.webp
  Cache-Control: public, max-age=31536000, immutable

# Cache para fuentes
/*.woff2
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: font/woff2
/*.woff
  Cache-Control: public, max-age=31536000, immutable
  Content-Type: font/woff

# Sin cache para index.html y manifest
/index.html
  Cache-Control: public, max-age=0, must-revalidate
/manifest.webmanifest
  Cache-Control: public, max-age=0, must-revalidate
`;

// Step 1: Copy browser/* files to dist/web/ root (required by Cloudflare Pages)
// Angular 17+ builds to dist/web/browser/, but Cloudflare expects files at dist/web/
if (fs.existsSync(browserPath)) {
  try {
    const files = fs.readdirSync(browserPath);
    for (const file of files) {
      const src = path.join(browserPath, file);
      const dest = path.join(distWebPath, file);

      if (fs.lstatSync(src).isDirectory()) {
        // Copy directory recursively
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        execSync(`cp -r "${src}"/* "${dest}"/`);
      } else {
        // Copy file
        fs.copyFileSync(src, dest);
      }
    }
    console.log('✅ Copied browser/ files to dist/web/ root');
  } catch (error) {
    console.error('❌ Error copying browser files:', error.message);
    process.exit(1);
  }
}

// Step 2: Escribir archivos de configuración en la raíz
fs.writeFileSync(path.join(distWebPath, '_redirects'), redirectsContent);
fs.writeFileSync(path.join(distWebPath, '_headers'), headersContent);

console.log('✅ Archivos de configuración de Cloudflare Pages creados:');
console.log('   - _redirects (SPA routing)');
console.log('   - _headers (Security & Cache)');
