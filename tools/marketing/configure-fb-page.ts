#!/usr/bin/env -S npx tsx
/**
 * Configure AutoRentar Facebook Page
 * - Upload profile picture
 * - Update page information
 */

import { readFileSync } from 'fs';

const PAGE_ID = '981435811711990';
const PAGE_TOKEN = 'EAASB4LzlXDEBQTQthZAn0WD6OhoMAj3ZAqAILh6HZCLRhc0BaJRTFESlQbDcZBsHBAYfGY6sjrzFVZCmWhgE8MaAHgL3HZAWK2GXrIGW0f6qf0J50JdaW8wk5UkXqhOgWzSnN2mXfIWQs7ZB4ZCs4Ki0pK4AvgCINpgtfLSfPJfFKnF3EJO23vbVAPUvpTr9KLyYYdZCe2t87B1DOhvxKVy2V3QikFneSuFVXeHjMrqUl';
const PROFILE_IMAGE = '/tmp/autorentar-profile-512.png';

async function configurePage() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          CONFIGURE AUTORENTAR FACEBOOK PAGE               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Step 1: Upload Profile Picture
  console.log('📸 Step 1: Uploading profile picture...');

  const imageBuffer = readFileSync(PROFILE_IMAGE);
  const blob = new Blob([imageBuffer], { type: 'image/png' });

  const photoForm = new FormData();
  photoForm.append('source', blob, 'autorentar-logo.png');
  photoForm.append('access_token', PAGE_TOKEN);

  const photoResponse = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/picture`, {
    method: 'POST',
    body: photoForm,
  });

  const photoData = await photoResponse.json();

  if (photoData.error) {
    console.error('❌ Profile picture upload failed:', photoData.error.message);
  } else {
    console.log('✅ Profile picture uploaded successfully!');
    console.log('');
  }

  // Step 2: Update Page Information
  console.log('📝 Step 2: Updating page information...');

  const pageInfo = {
    about: 'Alquiler de autos entre personas. Sin tarjeta de crédito. Proceso 100% digital. Verificación instantánea. Seguro y confiable.',
    description: `AutoRentar es la primera plataforma de alquiler de autos entre personas en Argentina y Brasil que NO requiere tarjeta de crédito.

🚗 Ventajas para arrendatarios:
• Sin tarjeta de crédito
• Pagos seguros con MercadoPago
• Verificación instantánea
• Amplia variedad de vehículos

🔑 Ventajas para propietarios:
• Genera ingresos pasivos
• Seguro incluido
• Depósito de garantía protegido
• Control total de tu auto

🔒 Seguridad garantizada para todos`,
    phone: '+55 11 99999-9999', // Placeholder - update with real number
    website: 'https://autorenta.com.br',
    access_token: PAGE_TOKEN,
  };

  const infoResponse = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(pageInfo),
  });

  const infoData = await infoResponse.json();

  if (infoData.error) {
    console.error('⚠️  Page info update:', infoData.error.message);
    console.log('   (Some fields may require additional permissions)\n');
  } else {
    console.log('✅ Page information updated!');
    console.log('');
  }

  //Step 3: Get current page info
  console.log('📊 Step 3: Current page status...\n');

  const statusResponse = await fetch(
    `https://graph.facebook.com/v21.0/${PAGE_ID}?fields=name,about,category,picture,link,fan_count&access_token=${PAGE_TOKEN}`
  );

  const status = await statusResponse.json();

  if (!status.error) {
    console.log('   Page Name:', status.name);
    console.log('   Category:', status.category);
    console.log('   About:', status.about || '(not set)');
    console.log('   Followers:', status.fan_count || 0);
    console.log('   Link:', status.link);
    console.log('   Picture:', status.picture?.data?.url || '(default)');
  }

  console.log('\n' + '═'.repeat(64));
  console.log('✅ PAGE CONFIGURATION COMPLETE!');
  console.log('═'.repeat(64));
  console.log('\n📱 Check your page at:');
  console.log('   https://www.facebook.com/profile.php?id=61586558399370\n');
}

configurePage().catch(console.error);
