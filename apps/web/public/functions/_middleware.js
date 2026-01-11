/**
 * Cloudflare Pages Middleware
 * Fixes Permissions-Policy header to allow camera access for vehicle scanner
 */
export async function onRequest(context) {
  const response = await context.next();

  // Clone response to modify headers
  const newResponse = new Response(response.body, response);

  // Set correct Permissions-Policy with camera=(self)
  newResponse.headers.set(
    'Permissions-Policy',
    'geolocation=(self), microphone=(), camera=(self), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  return newResponse;
}
