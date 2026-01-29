#!/usr/bin/env -S npx tsx
/**
 * Test Direct Facebook Post
 *
 * Usage:
 *   FACEBOOK_ACCESS_TOKEN=xxx FACEBOOK_PAGE_ID=yyy npx tsx tools/marketing/post-to-facebook.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const META_GRAPH_API = 'https://graph.facebook.com/v21.0';

interface PostResult {
  id?: string;
  post_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

async function postToFacebook(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              FACEBOOK POST TEST                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!accessToken || !pageId) {
    console.error('❌ Missing FACEBOOK_ACCESS_TOKEN or FACEBOOK_PAGE_ID');
    process.exit(1);
  }

  // First get the page access token
  console.log('🔑 Getting Page Access Token...\n');

  const pageTokenResponse = await fetch(
    `${META_GRAPH_API}/${pageId}?fields=access_token&access_token=${accessToken}`
  );

  const pageTokenData = await pageTokenResponse.json();

  if (pageTokenData.error) {
    console.error('❌ Error getting page token:', pageTokenData.error.message);
    process.exit(1);
  }

  const pageAccessToken = pageTokenData.access_token;
  console.log('✅ Got page access token\n');

  // Create the post
  const testMessage = `🚗 ¡AutoRentar está conectado!

Esta es una publicación de prueba desde nuestra plataforma de marketing automatizado.

🔧 Sistema: API Graph de Meta v21.0
📅 Fecha: ${new Date().toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })}

#AutoRentar #AlquilerDeAutos #Argentina #Test`;

  console.log('📝 Posting to Facebook...\n');
  console.log('Message preview:');
  console.log('─'.repeat(50));
  console.log(testMessage);
  console.log('─'.repeat(50));
  console.log('');

  const postResponse = await fetch(`${META_GRAPH_API}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      message: testMessage,
      access_token: pageAccessToken,
    }),
  });

  const postData: PostResult = await postResponse.json();

  if (postData.error) {
    console.error('❌ Post failed:', postData.error.message);
    console.error('   Type:', postData.error.type);
    console.error('   Code:', postData.error.code);

    if (postData.error.code === 190) {
      console.log('\n💡 Token might be expired or invalid.');
    } else if (postData.error.code === 200) {
      console.log('\n💡 Missing permission: pages_manage_posts');
      console.log('   Go to Graph API Explorer and add this permission.');
    }
    process.exit(1);
  }

  const postId = postData.id || postData.post_id;
  console.log('✅ Post published successfully!\n');
  console.log(`   Post ID: ${postId}`);
  console.log(`   URL: https://www.facebook.com/${postId}`);
  console.log('');
}

postToFacebook().catch(console.error);
