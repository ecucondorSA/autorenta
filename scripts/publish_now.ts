import { createClient } from "@supabase/supabase-js";

// Configuration
const SUPABASE_URL = "https://pisqjmoklivzpwufhscx.supabase.co";
const SERVICE_KEY = "sb_secret_qRFh5RZGAEyJgVf9B4HwQQ_91fSDRoF";

if (!SERVICE_KEY || !SUPABASE_URL) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log("🚀 Starting Immediate Marketing Publisher...");

  // 1. Generate Content
  console.log("\nStep 1: Generating Summer Content...");
  
  const payload = {
    content_type: "seasonal",
    platform: "instagram", // logic will generate for FB too if saving to DB
    theme: "Verano 2026, escapada de fin de semana, playa",
    language: "es",
    generate_image: true,
    save_to_db: true
  };

  const { data: genData, error: genError } = await supabase.functions.invoke("generate-marketing-content", {
    body: payload
  });

  if (genError) {
    console.error("❌ Generation failed:", genError);
    process.exit(1);
  }

  console.log("✅ Content Generated!", genData);

  // 2. Find the scheduled posts (they are scheduled for the future by default)
  console.log("\nStep 2: Finding pending posts to reschedule for NOW...");
  
  // We look for posts created in the last minute
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  
  const { data: posts, error: searchError } = await supabase
    .from("marketing_content_queue")
    .select("id, platform, scheduled_for")
    .eq("status", "pending")
    .gt("created_at", oneMinuteAgo);

  if (searchError) {
    console.error("❌ Search failed:", searchError);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.error("❌ No posts found to publish.");
    process.exit(1);
  }

  console.log(`Found ${posts.length} posts to publish immediately:`);
  posts.forEach(p => console.log(`- ${p.platform} (ID: ${p.id})`));

  // 3. Update scheduled_for to NOW
  const now = new Date().toISOString();
  const postIds = posts.map(p => p.id);

  const { error: updateError } = await supabase
    .from("marketing_content_queue")
    .update({ scheduled_for: now })
    .in("id", postIds);

  if (updateError) {
    console.error("❌ Update failed:", updateError);
    process.exit(1);
  }

  console.log("✅ Rescheduled posts to NOW.");

  // 4. Trigger Scheduler
  console.log("\nStep 3: Triggering Publisher...");

  const { data: scheduleData, error: scheduleError } = await supabase.functions.invoke("marketing-scheduler", {
    body: { max_posts: 10 } // Process up to 10 posts
  });

  if (scheduleError) {
    console.error("❌ Scheduler invocation failed:", scheduleError);
    process.exit(1);
  }

  console.log("✅ Publisher Triggered!");
  console.log("Result:", JSON.stringify(scheduleData, null, 2));
}

main();
