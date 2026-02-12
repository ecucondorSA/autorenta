import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async () => {
  const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
  const appId = Deno.env.get('MERCADOPAGO_APPLICATION_ID')!;
  
  // Try /applications endpoint
  const results: Record<string, unknown> = {};
  
  // 1. GET /applications/{app_id}
  try {
    const r1 = await fetch('https://api.mercadopago.com/applications/' + appId, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    results.app_endpoint = { status: r1.status, data: await r1.json() };
  } catch(e) { results.app_endpoint = { error: String(e) }; }
  
  // 2. GET /applications (list all)
  try {
    const r2 = await fetch('https://api.mercadopago.com/applications', {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    results.apps_list = { status: r2.status, data: await r2.json() };
  } catch(e) { results.apps_list = { error: String(e) }; }

  // 3. GET /oauth/credentials (undocumented but might work)
  try {
    const r3 = await fetch('https://api.mercadopago.com/oauth/credentials?client_id=' + appId, {
      headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    results.oauth_creds = { status: r3.status, data: await r3.json() };
  } catch(e) { results.oauth_creds = { error: String(e) }; }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
});
