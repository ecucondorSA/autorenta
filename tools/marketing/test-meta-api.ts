#!/usr/bin/env -S npx tsx
/**
 * Test Meta (Facebook/Instagram) API Connection
 *
 * Usage:
 *   FACEBOOK_ACCESS_TOKEN=xxx FACEBOOK_PAGE_ID=yyy npx tsx tools/marketing/test-meta-api.ts
 *
 * Or set environment variables in .env.local
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

const META_GRAPH_API = 'https://graph.facebook.com/v21.0';

interface MetaPageInfo {
  id: string;
  name: string;
  category?: string;
  about?: string;
  phone?: string;
  website?: string;
  picture?: { data: { url: string } };
}

interface MetaInstagramAccount {
  id: string;
  username?: string;
  name?: string;
  followers_count?: number;
  media_count?: number;
  profile_picture_url?: string;
}

interface TokenDebugInfo {
  app_id: string;
  type: string;
  is_valid: boolean;
  expires_at?: number;
  scopes?: string[];
}

async function testToken(accessToken: string): Promise<void> {
  console.log('🔑 Testing Access Token...\n');

  const response = await fetch(
    `${META_GRAPH_API}/debug_token?input_token=${accessToken}&access_token=${accessToken}`
  );

  const data = await response.json();

  if (data.error) {
    console.error('❌ Token Error:', data.error.message);
    throw new Error(data.error.message);
  }

  const info = data.data as TokenDebugInfo;
  console.log('✅ Token is valid!');
  console.log(`   App ID: ${info.app_id}`);
  console.log(`   Type: ${info.type}`);

  if (info.expires_at) {
    const expiresDate = new Date(info.expires_at * 1000);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`   Expires: ${expiresDate.toISOString()} (${daysRemaining} days remaining)`);
  } else {
    console.log('   Expires: Never (long-lived token)');
  }

  if (info.scopes?.length) {
    console.log(`   Scopes: ${info.scopes.join(', ')}`);
  }
}

async function getPageInfo(pageId: string, accessToken: string): Promise<MetaPageInfo | null> {
  console.log(`\n📄 Getting Page Info for ${pageId}...\n`);

  const response = await fetch(
    `${META_GRAPH_API}/${pageId}?fields=id,name,category,about,phone,website,picture&access_token=${accessToken}`
  );

  const data = await response.json();

  if (data.error) {
    console.error('❌ Page Error:', data.error.message);
    return null;
  }

  const page = data as MetaPageInfo;
  console.log('✅ Page found!');
  console.log(`   ID: ${page.id}`);
  console.log(`   Name: ${page.name}`);
  console.log(`   Category: ${page.category || 'N/A'}`);
  console.log(`   About: ${page.about?.substring(0, 100) || 'N/A'}`);
  console.log(`   Picture: ${page.picture?.data?.url || 'N/A'}`);

  return page;
}

async function getInstagramAccount(pageId: string, accessToken: string): Promise<MetaInstagramAccount | null> {
  console.log(`\n📸 Looking for linked Instagram Business Account...\n`);

  const response = await fetch(
    `${META_GRAPH_API}/${pageId}?fields=instagram_business_account{id,username,name,followers_count,media_count,profile_picture_url}&access_token=${accessToken}`
  );

  const data = await response.json();

  if (data.error) {
    console.error('❌ Instagram Error:', data.error.message);
    return null;
  }

  if (!data.instagram_business_account) {
    console.log('⚠️  No Instagram Business Account linked to this page.');
    console.log('   → Link an Instagram account to your Facebook Page to post to Instagram.');
    return null;
  }

  const ig = data.instagram_business_account as MetaInstagramAccount;
  console.log('✅ Instagram Business Account found!');
  console.log(`   ID: ${ig.id}`);
  console.log(`   Username: @${ig.username || 'N/A'}`);
  console.log(`   Name: ${ig.name || 'N/A'}`);
  console.log(`   Followers: ${ig.followers_count?.toLocaleString() || 'N/A'}`);
  console.log(`   Posts: ${ig.media_count?.toLocaleString() || 'N/A'}`);

  return ig;
}

async function testFacebookPost(pageId: string, accessToken: string): Promise<void> {
  console.log(`\n📝 Testing Facebook Post Creation (DRY RUN)...\n`);

  // Just validate we have the right permissions
  const response = await fetch(
    `${META_GRAPH_API}/${pageId}?fields=access_token&access_token=${accessToken}`
  );

  const data = await response.json();

  if (data.error) {
    console.error('❌ Cannot get page token:', data.error.message);
    return;
  }

  if (data.access_token) {
    console.log('✅ Have page post permissions!');
    console.log('   Ready to post to Facebook.');
  } else {
    console.log('⚠️  No page access token returned.');
    console.log('   May need pages_manage_posts permission.');
  }
}

async function listUserPages(accessToken: string): Promise<void> {
  console.log(`\n📋 Listing all Facebook Pages you manage...\n`);

  const response = await fetch(
    `${META_GRAPH_API}/me/accounts?fields=id,name,category,access_token&access_token=${accessToken}`
  );

  const data = await response.json();

  if (data.error) {
    console.error('❌ Cannot list pages:', data.error.message);
    return;
  }

  if (!data.data?.length) {
    console.log('⚠️  No pages found. Create a Facebook Page first.');
    return;
  }

  console.log('✅ Found pages:\n');
  for (const page of data.data) {
    console.log(`   📄 ${page.name}`);
    console.log(`      ID: ${page.id}`);
    console.log(`      Category: ${page.category || 'N/A'}`);
    console.log(`      Has Token: ${page.access_token ? '✅' : '❌'}`);
    console.log('');
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           META (Facebook/Instagram) API TESTER             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!accessToken) {
    console.error('❌ Missing FACEBOOK_ACCESS_TOKEN environment variable');
    console.log('\n📝 How to get a token:');
    console.log('   1. Go to https://developers.facebook.com/tools/explorer/');
    console.log('   2. Select your app');
    console.log('   3. Add permissions: pages_manage_posts, pages_read_engagement,');
    console.log('      instagram_basic, instagram_content_publish');
    console.log('   4. Click "Generate Access Token"');
    console.log('   5. Exchange for long-lived token');
    process.exit(1);
  }

  try {
    // Test the token
    await testToken(accessToken);

    // List available pages
    await listUserPages(accessToken);

    if (pageId) {
      // Get page info
      await getPageInfo(pageId, accessToken);

      // Check for Instagram
      const igAccount = await getInstagramAccount(pageId, accessToken);

      // Test posting capability
      await testFacebookPost(pageId, accessToken);

      // Summary
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('📊 SUMMARY - Environment Variables to Set in Supabase:');
      console.log('═══════════════════════════════════════════════════════════════\n');
      console.log(`FACEBOOK_ACCESS_TOKEN=${accessToken.substring(0, 20)}...`);
      console.log(`FACEBOOK_PAGE_ID=${pageId}`);

      if (igAccount) {
        console.log(`INSTAGRAM_ACCESS_TOKEN=${accessToken.substring(0, 20)}... (same as Facebook)`);
        console.log(`INSTAGRAM_PAGE_ID=${igAccount.id}`);
      }

      console.log('\n📌 To set in Supabase:');
      console.log('   supabase secrets set FACEBOOK_ACCESS_TOKEN=xxx');
      console.log('   supabase secrets set FACEBOOK_PAGE_ID=xxx');
      if (igAccount) {
        console.log('   supabase secrets set INSTAGRAM_ACCESS_TOKEN=xxx');
        console.log(`   supabase secrets set INSTAGRAM_PAGE_ID=${igAccount.id}`);
      }
    } else {
      console.log('\n⚠️  No FACEBOOK_PAGE_ID provided.');
      console.log('   Set FACEBOOK_PAGE_ID to test page-specific operations.');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }

  console.log('\n✅ Meta API test complete!\n');
}

main().catch(console.error);
