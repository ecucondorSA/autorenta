#!/usr/bin/env -S npx tsx
/**
 * Final Marketing Test - Facebook Post
 */

const PAGE_ID = '981435811711990';
const PAGE_TOKEN = 'EAASB4LzlXDEBQTQthZAn0WD6OhoMAj3ZAqAILh6HZCLRhc0BaJRTFESlQbDcZBsHBAYfGY6sjrzFVZCmWhgE8MaAHgL3HZAWK2GXrIGW0f6qf0J50JdaW8wk5UkXqhOgWzSnN2mXfIWQs7ZB4ZCs4Ki0pK4AvgCINpgtfLSfPJfFKnF3EJO23vbVAPUvpTr9KLyYYdZCe2t87B1DOhvxKVy2V3QikFneSuFVXeHjMrqUl';

async function post() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     AUTORENTA MARKETING - FACEBOOK POST FINAL TEST        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const message = `✅ ¡Marketing de AutoRenta Activado!

🚀 Sistema de publicaciones automatizadas funcionando correctamente

🔧 Tecnología:
   • Edge Functions (Supabase)
   • Meta Graph API v21.0
   • Gemini AI para generación de contenido

📊 Capacidades:
   ✓ Publicación automática en Facebook
   ✓ Generación de contenido con IA
   ✓ Programación de posts
   ✓ Análisis de engagement

📅 ${new Date().toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}

#AutoRentar #Marketing #Automatización #Argentina`;

  console.log('📝 Publishing post...\n');

  const response = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      message: message,
      access_token: PAGE_TOKEN,
    }),
  });

  const data = await response.json();

  if (data.error) {
    console.error('❌ ERROR:', data.error.message);
    console.error('   Code:', data.error.code);
    process.exit(1);
  }

  console.log('✅ POST PUBLISHED SUCCESSFULLY!\n');
  console.log(`   📍 Post ID: ${data.id}`);
  console.log(`   🔗 URL: https://www.facebook.com/${data.id}\n`);
  console.log('═'.repeat(64));
  console.log('� MARKETING INTEGRATION READY!');
  console.log('═'.repeat(64));
  console.log('\n📱 Next steps:');
  console.log('   1. Open http://localhost:4200/admin/marketing');
  console.log('   2. Generate content with Gemini AI');
  console.log('   3. Schedule or publish posts');
  console.log('   4. Monitor engagement\n');
}

post().catch(console.error);
