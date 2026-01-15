#!/usr/bin/env -S npx tsx
/**
 * Facebook Post with Image - No Credit Card Required
 */

import { readFileSync } from 'fs';

const PAGE_ID = '981435811711990';
const PAGE_TOKEN = 'EAASB4LzlXDEBQTQthZAn0WD6OhoMAj3ZAqAILh6HZCLRhc0BaJRTFESlQbDcZBsHBAYfGY6sjrzFVZCmWhgE8MaAHgL3HZAWK2GXrIGW0f6qf0J50JdaW8wk5UkXqhOgWzSnN2mXfIWQs7ZB4ZCs4Ki0pK4AvgCINpgtfLSfPJfFKnF3EJO23vbVAPUvpTr9KLyYYdZCe2t87B1DOhvxKVy2V3QikFneSuFVXeHjMrqUl';
const IMAGE_PATH = '/home/edu/.gemini/antigravity/brain/5bc28fd6-7da1-48f5-9b62-8a46acf7f49c/autorenta_sin_tarjeta_1768400252317.png';

async function postWithImage() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         FACEBOOK POST WITH IMAGE - NO CREDIT CARD          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const caption = `🚗 ¡Alquila tu auto SIN tarjeta de crédito!

✅ En AutoRentar revolucionamos el alquiler de autos:

🚫 NO pedimos tarjeta de crédito
✓ Proceso 100% digital
✓ Verificación instantánea
✓ Pago seguro con MercadoPago
✓ Depósito de garantía sin bloqueos

💡 ¿Cómo funciona?
1. Crea tu cuenta
2. Verifica tu identidad
3. Elige el auto perfecto
4. ¡Maneja hoy mismo!

🔒 Seguridad garantizada para propietarios y arrendatarios

📱 Descarga AutoRentar y empieza a ahorrar

#AutoRentar #SinTarjeta #AlquilerDeAutos #Argentina #Brasil #MercadoPago #Innovación`;

  console.log('📝 Caption:');
  console.log('─'.repeat(60));
  console.log(caption);
  console.log('─'.repeat(60));
  console.log('');

  // Step 1: Upload image to Facebook
  console.log('📤 Uploading image...');

  const imageBuffer = readFileSync(IMAGE_PATH);
  const blob = new Blob([imageBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('source', blob, 'autorenta_sin_tarjeta.png');
  formData.append('published', 'false'); // Upload without publishing
  formData.append('access_token', PAGE_TOKEN);

  const uploadResponse = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/photos`, {
    method: 'POST',
    body: formData,
  });

  const uploadData = await uploadResponse.json();

  if (uploadData.error) {
    console.error('❌ Image upload failed:', uploadData.error.message);
    process.exit(1);
  }

  console.log('✅ Image uploaded! ID:', uploadData.id);
  console.log('');

  // Step 2: Create post with uploaded image
  console.log('📝 Publishing post with image...');

  const postResponse = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      message: caption,
      attached_media: JSON.stringify([{ media_fbid: uploadData.id }]),
      access_token: PAGE_TOKEN,
    }),
  });

  const postData = await postResponse.json();

  if (postData.error) {
    console.error('❌ Post failed:', postData.error.message);
    console.error('   Code:', postData.error.code);
    process.exit(1);
  }

  console.log('✅ POST WITH IMAGE PUBLISHED!\n');
  console.log(`   📍 Post ID: ${postData.id}`);
  console.log(`   🔗 URL: https://www.facebook.com/${postData.id}\n`);
  console.log('═'.repeat(64));
  console.log('🎉 Marketing post con imagen publicado exitosamente!');
  console.log('═'.repeat(64));
}

postWithImage().catch(console.error);
