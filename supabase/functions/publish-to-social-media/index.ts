#!/usr/bin/env deno

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Credenciales desde Supabase Secrets (NUNCA hardcodear)
const FACEBOOK_ACCESS_TOKEN = Deno.env.get("FACEBOOK_ACCESS_TOKEN")!;
const FACEBOOK_PAGE_ID = Deno.env.get("FACEBOOK_PAGE_ID")!;

const INSTAGRAM_ACCESS_TOKEN = Deno.env.get("INSTAGRAM_ACCESS_TOKEN")!;
const INSTAGRAM_BUSINESS_ID = Deno.env.get("INSTAGRAM_BUSINESS_ID")!;

const LINKEDIN_ACCESS_TOKEN = Deno.env.get("LINKEDIN_ACCESS_TOKEN")!;
const LINKEDIN_PAGE_ID = Deno.env.get("LINKEDIN_PAGE_ID")!;

const TIKTOK_ACCESS_TOKEN = Deno.env.get("TIKTOK_ACCESS_TOKEN")!;
const TIKTOK_BUSINESS_ID = Deno.env.get("TIKTOK_BUSINESS_ID")!;

const GRAPH_API_VERSION = "v20.0";

interface PublishRequest {
  campaignId: string;
  title: string;
  description: string;
  imageUrl?: string;
  ctaText: string;
  ctaUrl: string;
  platforms: string[];
}

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

// ============================================================================
// VALIDAR CREDENCIALES DE FACEBOOK
// ============================================================================
async function validateFacebookCredentials(): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/me?access_token=${FACEBOOK_ACCESS_TOKEN}`
    );
    if (!response.ok) {
      throw new Error("Invalid Facebook access token");
    }
    console.log("✅ Facebook credentials validated");
    return true;
  } catch (error) {
    console.error("❌ Facebook credential validation failed:", error);
    return false;
  }
}

// ============================================================================
// PUBLICAR A FACEBOOK
// ============================================================================
async function publishToFacebook(
  content: string,
  imageUrl?: string
): Promise<PublishResult> {
  try {
    console.log("📘 Publishing to Facebook...");

    const body = new URLSearchParams({
      message: content,
      access_token: FACEBOOK_ACCESS_TOKEN,
    });

    if (imageUrl) {
      body.append("picture", imageUrl);
    }

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${FACEBOOK_PAGE_ID}/feed`,
      {
        method: "POST",
        body: body,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook API error: ${error}`);
    }

    const data = await response.json();
    const postUrl = `https://www.facebook.com/${FACEBOOK_PAGE_ID}/posts/${data.id}`;

    console.log(`✅ Facebook post published: ${postUrl}`);

    return {
      platform: "facebook",
      success: true,
      postId: data.id,
      postUrl,
    };
  } catch (error) {
    console.error("❌ Facebook publishing failed:", error);
    return {
      platform: "facebook",
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// VALIDAR CREDENCIALES DE INSTAGRAM
// ============================================================================
async function validateInstagramCredentials(): Promise<boolean> {
  try {
    const response = await fetch(
      `https://graph.instagram.com/${GRAPH_API_VERSION}/${INSTAGRAM_BUSINESS_ID}?access_token=${INSTAGRAM_ACCESS_TOKEN}`
    );
    if (!response.ok) {
      throw new Error("Invalid Instagram access token or business account ID");
    }
    console.log("✅ Instagram credentials validated");
    return true;
  } catch (error) {
    console.error("❌ Instagram credential validation failed:", error);
    return false;
  }
}

// ============================================================================
// PUBLICAR A INSTAGRAM
// ============================================================================
async function publishToInstagram(
  content: string,
  imageUrl?: string
): Promise<PublishResult> {
  try {
    console.log("📷 Publishing to Instagram...");

    if (!imageUrl) {
      throw new Error("Instagram requires an image URL");
    }

    // Step 1: Create container
    const containerResponse = await fetch(
      `https://graph.instagram.com/${GRAPH_API_VERSION}/${INSTAGRAM_BUSINESS_ID}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          image_url: imageUrl,
          caption: content,
          access_token: INSTAGRAM_ACCESS_TOKEN,
        }),
      }
    );

    if (!containerResponse.ok) {
      const error = await containerResponse.text();
      throw new Error(`Instagram container creation failed: ${error}`);
    }

    const containerData = await containerResponse.json();

    // Step 2: Publish container
    const publishResponse = await fetch(
      `https://graph.instagram.com/${GRAPH_API_VERSION}/${INSTAGRAM_BUSINESS_ID}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          creation_id: containerData.id,
          access_token: INSTAGRAM_ACCESS_TOKEN,
        }),
      }
    );

    if (!publishResponse.ok) {
      const error = await publishResponse.text();
      throw new Error(`Instagram publish failed: ${error}`);
    }

    const publishData = await publishResponse.json();
    const postUrl = `https://www.instagram.com/p/${publishData.id}`;

    console.log(`✅ Instagram post published: ${postUrl}`);

    return {
      platform: "instagram",
      success: true,
      postId: publishData.id,
      postUrl,
    };
  } catch (error) {
    console.error("❌ Instagram publishing failed:", error);
    return {
      platform: "instagram",
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// PUBLICAR A LINKEDIN
// ============================================================================
async function publishToLinkedIn(content: string): Promise<PublishResult> {
  try {
    console.log("💼 Publishing to LinkedIn...");

    const response = await fetch(
      `https://api.linkedin.com/rest/posts?X-Restli-Protocol-Version=2.0.0`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          author: `urn:li:organization:${LINKEDIN_PAGE_ID}`,
          commentary: content,
          visibility: "PUBLIC",
          distribution: {
            feedDistribution: "MAIN_FEED",
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LinkedIn API error: ${error}`);
    }

    const headers = response.headers;
    const postId = headers.get("x-linkedin-id") || "unknown";
    const postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${postId}`;

    console.log(`✅ LinkedIn post published: ${postUrl}`);

    return {
      platform: "linkedin",
      success: true,
      postId,
      postUrl,
    };
  } catch (error) {
    console.error("❌ LinkedIn publishing failed:", error);
    return {
      platform: "linkedin",
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// PUBLICAR A TIKTOK
// ============================================================================
async function publishToTikTok(
  content: string,
  _imageUrl?: string
): Promise<PublishResult> {
  try {
    console.log("🎵 Publishing to TikTok...");

    // TikTok Business API es más compleja, requiere video upload
    // Por ahora retornamos un placeholder
    console.log(
      "⚠️ TikTok publishing requires video upload - manual review needed"
    );

    return {
      platform: "tiktok",
      success: false,
      error: "TikTok video upload not yet implemented",
    };
  } catch (error) {
    console.error("❌ TikTok publishing failed:", error);
    return {
      platform: "tiktok",
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// VALIDAR TODAS LAS CREDENCIALES
// ============================================================================
async function validateAllCredentials(platforms: string[]): Promise<Map<string, boolean>> {
  const validationResults = new Map<string, boolean>();

  if (platforms.includes("facebook")) {
    validationResults.set("facebook", await validateFacebookCredentials());
  }

  if (platforms.includes("instagram")) {
    validationResults.set("instagram", await validateInstagramCredentials());
  }

  if (platforms.includes("linkedin")) {
    validationResults.set("linkedin", LINKEDIN_ACCESS_TOKEN ? true : false);
  }

  if (platforms.includes("tiktok")) {
    validationResults.set("tiktok", TIKTOK_ACCESS_TOKEN ? true : false);
  }

  return validationResults;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: PublishRequest = await req.json();

    console.log("🚀 Publishing campaign to social media:", {
      campaignId: payload.campaignId,
      platforms: payload.platforms,
    });

    // Validar que tenga título y descripción
    if (!payload.title || !payload.description) {
      return new Response(
        JSON.stringify({ error: "Missing title or description" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validar credenciales antes de intentar publicar
    console.log("🔐 Validating credentials for platforms:", payload.platforms);
    const credentialValidation = await validateAllCredentials(payload.platforms);

    const invalidPlatforms = Array.from(credentialValidation.entries())
      .filter(([_, isValid]) => !isValid)
      .map(([platform, _]) => platform);

    if (invalidPlatforms.length > 0) {
      console.error("❌ Invalid credentials for platforms:", invalidPlatforms);
      return new Response(
        JSON.stringify({
          error: `Invalid credentials for: ${invalidPlatforms.join(", ")}`,
          invalidPlatforms
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ All credentials validated successfully");

    // Preparar contenido
    const content = `${payload.title}\n\n${payload.description}\n\n${payload.ctaText}\n${payload.ctaUrl}`;

    // Publicar EN PARALELO a todas las plataformas solicitadas
    const publishTasks = [];

    if (payload.platforms.includes("facebook")) {
      publishTasks.push(publishToFacebook(content, payload.imageUrl));
    }

    if (payload.platforms.includes("instagram")) {
      publishTasks.push(publishToInstagram(content, payload.imageUrl));
    }

    if (payload.platforms.includes("linkedin")) {
      publishTasks.push(publishToLinkedIn(content));
    }

    if (payload.platforms.includes("tiktok")) {
      publishTasks.push(publishToTikTok(content, payload.imageUrl));
    }

    const results: PublishResult[] = await Promise.all(publishTasks);

    // Guardar resultados en Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    for (const result of results) {
      await supabase.from("social_publishing_log").insert({
        campaign_id: payload.campaignId,
        platform: result.platform,
        post_id: result.postId || null,
        post_url: result.postUrl || null,
        status: result.success ? "success" : "failed",
        error_message: result.error || null,
        completed_at: new Date().toISOString(),
      });
    }

    // Actualizar status de campaña
    const successCount = results.filter((r) => r.success).length;
    const status =
      successCount === results.length
        ? "published"
        : successCount > 0
          ? "partial"
          : "failed";

    await supabase
      .from("campaign_schedules")
      .update({
        status,
        published_at: new Date().toISOString(),
        post_ids: results.reduce(
          (acc, r) => {
            if (r.success) acc[r.platform] = r.postId;
            return acc;
          },
          {} as Record<string, string>
        ),
      })
      .eq("id", payload.campaignId);

    console.log("✅ Publishing complete:", {
      total: results.length,
      success: successCount,
      results,
    });

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error in publish-to-social-media:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
