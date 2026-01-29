/**
 * Envía una edición de newsletter a todos los suscriptores activos
 *
 * Usage: bun scripts/send-newsletter.ts [edition_id]
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
  console.error("❌ Variables requeridas: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY");
  process.exit(1);
}

interface NewsletterEdition {
  id: string;
  title: string;
  edition_number: number;
  subject: string;
  preview_text: string;
  html_content: string;
  target_audience: "all" | "owners" | "renters";
}

interface Subscriber {
  id: string;
  email: string;
  first_name: string | null;
  user_type: string;
}

async function getEdition(editionId?: string): Promise<NewsletterEdition> {
  let url = `${SUPABASE_URL}/rest/v1/newsletter_editions?`;

  if (editionId) {
    url += `id=eq.${editionId}`;
  } else {
    url += `status=eq.scheduled&order=scheduled_at.asc&limit=1`;
  }

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  const editions = await response.json();

  if (!editions || editions.length === 0) {
    throw new Error("No newsletter edition found");
  }

  return editions[0];
}

async function getSubscribers(audience: string): Promise<Subscriber[]> {
  let url = `${SUPABASE_URL}/rest/v1/email_subscribers?status=eq.active&select=id,email,first_name,user_type`;

  // Filter by audience if not 'all'
  if (audience === "owners") {
    url += `&user_type=eq.owner`;
  } else if (audience === "renters") {
    url += `&user_type=eq.renter`;
  }

  // Also check preferences
  url += `&preferences->newsletter=eq.true`;

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  return await response.json();
}

async function sendEmail(
  subscriber: Subscriber,
  edition: NewsletterEdition
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Replace variables in content
  let html = edition.html_content;
  html = html.replace(/\{\{first_name\}\}/g, subscriber.first_name || "Usuario");
  html = html.replace(
    /\{\{unsubscribe_url\}\}/g,
    `https://autorentar.com/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
  );

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "AutoRentar Newsletter <newsletter@autorentar.com>",
      to: [subscriber.email],
      subject: edition.subject,
      html: html,
      headers: {
        "List-Unsubscribe": `<https://autorentar.com/unsubscribe?email=${encodeURIComponent(subscriber.email)}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: JSON.stringify(error) };
  }

  const result = await response.json();
  return { success: true, messageId: result.id };
}

async function recordSend(
  subscriberId: string,
  email: string,
  subject: string,
  messageId: string | null
) {
  await fetch(`${SUPABASE_URL}/rest/v1/email_sends`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscriber_id: subscriberId,
      to_email: email,
      subject: subject,
      provider: "resend",
      provider_message_id: messageId,
      status: messageId ? "sent" : "failed",
      sent_at: new Date().toISOString(),
    }),
  });
}

async function updateEditionStatus(editionId: string, status: string, sentCount: number) {
  await fetch(`${SUPABASE_URL}/rest/v1/newsletter_editions?id=eq.${editionId}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: status,
      sent_at: new Date().toISOString(),
      total_sent: sentCount,
    }),
  });
}

async function main() {
  const editionId = process.argv[2];

  console.log("═══════════════════════════════════════");
  console.log("   Envío de Newsletter AutoRentar");
  console.log("═══════════════════════════════════════\n");

  // Get edition
  console.log("📰 Obteniendo edición...");
  const edition = await getEdition(editionId);
  console.log(`   Edition #${edition.edition_number}: ${edition.subject}`);
  console.log(`   Audience: ${edition.target_audience}`);

  // Get subscribers
  console.log("\n👥 Obteniendo suscriptores...");
  const subscribers = await getSubscribers(edition.target_audience);
  console.log(`   Total: ${subscribers.length} suscriptores activos`);

  if (subscribers.length === 0) {
    console.log("\n⚠️ No hay suscriptores para enviar");
    return;
  }

  // Send emails
  console.log("\n📧 Enviando emails...");
  let sent = 0;
  let failed = 0;

  // Process in batches to respect rate limits
  const BATCH_SIZE = 10;
  const DELAY_MS = 1000; // 1 second between batches

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (subscriber) => {
        const result = await sendEmail(subscriber, edition);

        if (result.success) {
          sent++;
          await recordSend(subscriber.id, subscriber.email, edition.subject, result.messageId!);
          console.log(`   ✅ ${subscriber.email}`);
        } else {
          failed++;
          await recordSend(subscriber.id, subscriber.email, edition.subject, null);
          console.log(`   ❌ ${subscriber.email}: ${result.error}`);
        }
      })
    );

    // Wait between batches
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    // Progress
    const progress = Math.min(i + BATCH_SIZE, subscribers.length);
    console.log(`   Progress: ${progress}/${subscribers.length}`);
  }

  // Update edition status
  await updateEditionStatus(edition.id, "sent", sent);

  console.log("\n─── Resultado Final ───");
  console.log(`✅ Enviados: ${sent}`);
  console.log(`❌ Fallidos: ${failed}`);
  console.log(`📊 Tasa de éxito: ${((sent / subscribers.length) * 100).toFixed(1)}%`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
