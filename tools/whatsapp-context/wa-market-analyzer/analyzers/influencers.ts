/**
 * Influencer Analysis - Top sellers and active users
 */
import { getDb, getJidInfo, getChatById } from "../lib/db";
import { EXCLUDED_CHAT_IDS, containsExcludedKeyword } from "../lib/filters";

export interface InfluencerProfile {
  jidId: number;
  phoneNumber: string;
  totalMessages: number;
  groupsActive: number;
  groupNames: string[];
  topCategories: Array<{ category: string; count: number }>;
  isSpam: boolean;
  spamIndicators: string[];
  sampleMessages: string[];
  firstSeen: string;
  lastSeen: string;
  activityScore: number;
}

export interface InfluencersReport {
  generatedAt: string;
  totalUniqueUsers: number;
  topSellers: InfluencerProfile[];
  topBuyers: InfluencerProfile[];
  spamAccounts: InfluencerProfile[];
  insights: string[];
}

// Spam detection patterns
const SPAM_PATTERNS = [
  /link en bio/i,
  /click en/i,
  /t\.me\//i,
  /bit\.ly/i,
  /wa\.me/i,
  /👇.*link/i,
  /promoción.*limitada/i,
  /oferta.*exclusiva/i,
  /gana dinero/i,
  /trabaja desde casa/i,
  /inversión.*garantizada/i,
];

// Category detection keywords
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Comida": ["tequeños", "empanadas", "delivery", "comida", "almuerzo", "viandas", "torta"],
  "Electrónicos": ["iphone", "celular", "notebook", "laptop", "samsung", "xiaomi"],
  "Ropa": ["ropa", "zapatos", "zapatillas", "jean", "remera", "campera"],
  "Vivienda": ["habitación", "alquilo", "roomie", "depto", "departamento"],
  "Servicios": ["limpieza", "plomero", "electricista", "manicura", "peluquería"],
  "Transporte": ["auto", "moto", "bicicleta", "viaje", "remis"],
};

/**
 * Detect spam indicators in messages
 */
function detectSpamIndicators(messages: string[]): string[] {
  const indicators: string[] = [];
  const allText = messages.join(" ").toLowerCase();

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(allText)) {
      indicators.push(pattern.source);
    }
  }

  // High repetition indicator
  const uniqueMessages = new Set(messages.map(m => m.toLowerCase().trim()));
  if (messages.length > 10 && uniqueMessages.size < messages.length * 0.3) {
    indicators.push("high_message_repetition");
  }

  // External links indicator
  const linkCount = (allText.match(/https?:\/\//g) || []).length;
  if (linkCount > messages.length * 0.5) {
    indicators.push("excessive_links");
  }

  return indicators;
}

/**
 * Detect categories from messages
 */
function detectCategories(messages: string[]): Array<{ category: string; count: number }> {
  const categoryCounts: Record<string, number> = {};

  for (const msg of messages) {
    const lowerMsg = msg.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerMsg.includes(keyword)) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          break; // Count each message once per category
        }
      }
    }
  }

  return Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate activity score (0-100)
 */
function calculateActivityScore(
  totalMessages: number,
  groupsActive: number,
  daysSinceFirst: number,
  isSpam: boolean
): number {
  if (isSpam) return 0;

  // Base score from message count (max 40 points)
  let score = Math.min(40, totalMessages / 10);

  // Groups diversity bonus (max 30 points)
  score += Math.min(30, groupsActive * 3);

  // Consistency bonus (max 30 points) - messages per day
  if (daysSinceFirst > 0) {
    const msgsPerDay = totalMessages / daysSinceFirst;
    score += Math.min(30, msgsPerDay * 10);
  }

  return Math.round(Math.min(100, score));
}

/**
 * Analyze top influencers/sellers
 */
export function analyzeInfluencers(limit = 50): InfluencersReport {
  const db = getDb();
  const excludedChatsClause = `chat_row_id NOT IN (${EXCLUDED_CHAT_IDS.join(",")})`;

  // Get total unique users
  const uniqueUsersQuery = `
    SELECT COUNT(DISTINCT sender_jid_row_id) as count
    FROM message
    WHERE from_me = 0
      AND ${excludedChatsClause}
  `;
  const uniqueUsersResult = db.query<{ count: number }, []>(uniqueUsersQuery).get();
  const totalUniqueUsers = uniqueUsersResult?.count ?? 0;

  // Get top sellers (users with "vendo" messages)
  const topSellersQuery = `
    SELECT
      sender_jid_row_id,
      COUNT(*) as total_msgs,
      COUNT(DISTINCT chat_row_id) as groups_active,
      MIN(timestamp) as first_seen,
      MAX(timestamp) as last_seen
    FROM message
    WHERE from_me = 0
      AND text_data IS NOT NULL
      AND ${excludedChatsClause}
      AND LOWER(text_data) LIKE '%vendo%'
    GROUP BY sender_jid_row_id
    HAVING total_msgs >= 5
    ORDER BY total_msgs DESC
    LIMIT ${limit * 2}
  `;
  const sellersRaw = db.query<{
    sender_jid_row_id: number;
    total_msgs: number;
    groups_active: number;
    first_seen: number;
    last_seen: number;
  }, []>(topSellersQuery).all();

  // Get top buyers (users with "busco" messages)
  const topBuyersQuery = `
    SELECT
      sender_jid_row_id,
      COUNT(*) as total_msgs,
      COUNT(DISTINCT chat_row_id) as groups_active,
      MIN(timestamp) as first_seen,
      MAX(timestamp) as last_seen
    FROM message
    WHERE from_me = 0
      AND text_data IS NOT NULL
      AND ${excludedChatsClause}
      AND (LOWER(text_data) LIKE '%busco%' OR LOWER(text_data) LIKE '%necesito%')
    GROUP BY sender_jid_row_id
    HAVING total_msgs >= 3
    ORDER BY total_msgs DESC
    LIMIT ${limit}
  `;
  const buyersRaw = db.query<{
    sender_jid_row_id: number;
    total_msgs: number;
    groups_active: number;
    first_seen: number;
    last_seen: number;
  }, []>(topBuyersQuery).all();

  // Build profiles
  const buildProfile = (row: typeof sellersRaw[0], type: "seller" | "buyer"): InfluencerProfile => {
    const jidInfo = getJidInfo(row.sender_jid_row_id);
    const phoneNumber = jidInfo?.user ?? `unknown_${row.sender_jid_row_id}`;

    // Get group names
    const groupsQuery = `
      SELECT DISTINCT chat_row_id FROM message
      WHERE sender_jid_row_id = ?
        AND ${excludedChatsClause}
    `;
    const groups = db.query<{ chat_row_id: number }, [number]>(groupsQuery).all(row.sender_jid_row_id);
    const groupNames = groups
      .map(g => getChatById(g.chat_row_id)?.subject ?? "Unknown")
      .filter(n => n !== "Unknown");

    // Get sample messages
    const keyword = type === "seller" ? "vendo" : "busco";
    const samplesQuery = `
      SELECT text_data FROM message
      WHERE sender_jid_row_id = ?
        AND ${excludedChatsClause}
        AND LOWER(text_data) LIKE '%${keyword}%'
        AND LENGTH(text_data) > 20
        AND LENGTH(text_data) < 500
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    const samples = db.query<{ text_data: string }, [number]>(samplesQuery).all(row.sender_jid_row_id);
    const sampleMessages = samples
      .map(s => s.text_data)
      .filter(m => !containsExcludedKeyword(m));

    // Detect spam
    const spamIndicators = detectSpamIndicators(sampleMessages);
    const isSpam = spamIndicators.length >= 2;

    // Detect categories
    const topCategories = detectCategories(sampleMessages);

    // Calculate dates
    const firstSeen = new Date(row.first_seen).toISOString().split("T")[0];
    const lastSeen = new Date(row.last_seen).toISOString().split("T")[0];
    const daysSinceFirst = Math.max(1, Math.floor((row.last_seen - row.first_seen) / (1000 * 60 * 60 * 24)));

    // Calculate activity score
    const activityScore = calculateActivityScore(
      row.total_msgs,
      row.groups_active,
      daysSinceFirst,
      isSpam
    );

    return {
      jidId: row.sender_jid_row_id,
      phoneNumber,
      totalMessages: row.total_msgs,
      groupsActive: row.groups_active,
      groupNames: groupNames.slice(0, 5),
      topCategories: topCategories.slice(0, 3),
      isSpam,
      spamIndicators,
      sampleMessages: sampleMessages.slice(0, 3),
      firstSeen,
      lastSeen,
      activityScore,
    };
  };

  // Process sellers
  const sellerProfiles = sellersRaw.map(r => buildProfile(r, "seller"));
  const legitimateSellers = sellerProfiles.filter(p => !p.isSpam).slice(0, limit);
  const spamAccounts = sellerProfiles.filter(p => p.isSpam).slice(0, 20);

  // Process buyers
  const buyerProfiles = buyersRaw.map(r => buildProfile(r, "buyer"));
  const legitimateBuyers = buyerProfiles.filter(p => !p.isSpam).slice(0, limit);

  // Sort by activity score
  legitimateSellers.sort((a, b) => b.activityScore - a.activityScore);
  legitimateBuyers.sort((a, b) => b.activityScore - a.activityScore);

  // Generate insights
  const insights: string[] = [];

  if (legitimateSellers.length > 0) {
    const topSeller = legitimateSellers[0];
    const topCategory = topSeller.topCategories[0]?.category ?? "General";
    insights.push(`Vendedor más activo: ${topSeller.phoneNumber} con ${topSeller.totalMessages} mensajes en ${topCategory}`);
  }

  const multiGroupSellers = legitimateSellers.filter(s => s.groupsActive >= 3);
  insights.push(`${multiGroupSellers.length} vendedores están activos en 3+ grupos (mayor alcance)`);

  if (spamAccounts.length > 0) {
    insights.push(`${spamAccounts.length} cuentas detectadas como posible spam`);
  }

  // Category distribution among top sellers
  const categoryDist: Record<string, number> = {};
  for (const seller of legitimateSellers.slice(0, 20)) {
    for (const cat of seller.topCategories) {
      categoryDist[cat.category] = (categoryDist[cat.category] || 0) + 1;
    }
  }
  const topCategory = Object.entries(categoryDist).sort((a, b) => b[1] - a[1])[0];
  if (topCategory) {
    insights.push(`${topCategory[0]} es la categoría dominante entre top vendedores`);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalUniqueUsers,
    topSellers: legitimateSellers,
    topBuyers: legitimateBuyers,
    spamAccounts,
    insights,
  };
}
