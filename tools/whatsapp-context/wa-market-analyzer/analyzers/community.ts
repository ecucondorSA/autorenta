/**
 * Community Analysis - Segmentation by group type and demographics
 */
import { getDb, getAllChats } from "../lib/db";
import { EXCLUDED_CHAT_IDS } from "../lib/filters";

export interface CommunitySegment {
  id: string;
  name: string;
  description: string;
  chatIds: number[];
  chatNames: string[];
  totalMessages: number;
  activeUsers: number;
  topKeywords: Array<{ keyword: string; count: number }>;
  characteristics: string[];
}

export interface CommunityReport {
  generatedAt: string;
  totalChats: number;
  totalMessages: number;
  segments: CommunitySegment[];
  unclassifiedChats: Array<{ id: number; name: string; messageCount: number }>;
  insights: string[];
}

// Segment definitions based on chat name patterns
const SEGMENT_PATTERNS: Array<{
  id: string;
  name: string;
  description: string;
  patterns: RegExp[];
  keywords: string[];
}> = [
  {
    id: "ecuatorianos",
    name: "Comunidad Ecuatoriana",
    description: "Grupos de ecuatorianos en Argentina",
    patterns: [
      /mijines/i,
      /ecuatorian/i,
      /ecuador/i,
      /ecua/i,
      /guayaquil/i,
      /quito/i,
    ],
    keywords: ["encebollado", "ceviche", "seco", "bolón", "empanadas", "tequeños"],
  },
  {
    id: "brasilenos",
    name: "Comunidad Brasileña",
    description: "Grupos de brasileños y lusoparlantes",
    patterns: [
      /brasil/i,
      /fique esperto/i,
      /brasileir/i,
      /português/i,
      /portugues/i,
    ],
    keywords: ["pix", "reais", "brasileiro", "sp", "rj", "oi", "obrigado"],
  },
  {
    id: "estudiantes",
    name: "Estudiantes",
    description: "Grupos de estudiantes universitarios",
    patterns: [
      /remediar/i,
      /fmed/i,
      /medicina/i,
      /facultad/i,
      /universidad/i,
      /unlp/i,
      /uba/i,
      /estudiantes/i,
    ],
    keywords: ["apuntes", "parcial", "final", "cátedra", "cursada", "anatomía", "fisiología"],
  },
  {
    id: "comerciantes",
    name: "Comerciantes/Vendedores",
    description: "Grupos de compra-venta",
    patterns: [
      /compra.*venta/i,
      /venta/i,
      /marketplace/i,
      /olx/i,
      /feria/i,
      /emprendedor/i,
    ],
    keywords: ["vendo", "busco", "precio", "oferta", "nuevo", "usado", "envío"],
  },
  {
    id: "la_plata",
    name: "La Plata",
    description: "Grupos específicos de La Plata",
    patterns: [
      /la plata/i,
      /city bell/i,
      /gonnet/i,
      /tolosa/i,
      /berisso/i,
      /ensenada/i,
    ],
    keywords: ["diagonal", "plaza", "centro", "terminal", "bosque"],
  },
  {
    id: "caba",
    name: "CABA",
    description: "Grupos de Ciudad de Buenos Aires",
    patterns: [
      /caba/i,
      /capital federal/i,
      /buenos aires/i,
      /palermo/i,
      /belgrano/i,
      /recoleta/i,
      /once/i,
      /microcentro/i,
    ],
    keywords: ["subte", "colectivo", "bondi", "caba", "obelisco"],
  },
  {
    id: "servicios",
    name: "Servicios",
    description: "Grupos de oferta de servicios",
    patterns: [
      /servicio/i,
      /trabajo/i,
      /empleo/i,
      /freelance/i,
    ],
    keywords: ["limpieza", "plomero", "electricista", "gasista", "trabajo"],
  },
  {
    id: "vivienda",
    name: "Vivienda/Alquileres",
    description: "Grupos de búsqueda de vivienda",
    patterns: [
      /alquiler/i,
      /habitaci[oó]n/i,
      /depto/i,
      /roomie/i,
      /vivienda/i,
    ],
    keywords: ["habitación", "alquilo", "roomie", "expensas", "dueño directo"],
  },
];

/**
 * Classify a chat into a segment
 */
function classifyChat(chatName: string): string | null {
  for (const segment of SEGMENT_PATTERNS) {
    for (const pattern of segment.patterns) {
      if (pattern.test(chatName)) {
        return segment.id;
      }
    }
  }
  return null;
}

/**
 * Analyze community segments
 */
export function analyzeCommunity(): CommunityReport {
  const db = getDb();

  // Get all chats
  const allChats = getAllChats();

  // Filter out excluded chats
  const filteredChats = allChats.filter(c => !EXCLUDED_CHAT_IDS.includes(c._id));

  // Classify chats into segments
  const segmentChats: Record<string, Array<{ id: number; name: string; messageCount: number }>> = {};
  const unclassifiedChats: Array<{ id: number; name: string; messageCount: number }> = [];

  for (const chat of filteredChats) {
    const chatName = chat.subject ?? chat.raw_string ?? "Unknown";
    const segmentId = classifyChat(chatName);

    if (segmentId) {
      if (!segmentChats[segmentId]) {
        segmentChats[segmentId] = [];
      }
      segmentChats[segmentId].push({
        id: chat._id,
        name: chatName,
        messageCount: chat.messageCount,
      });
    } else if (chat.messageCount > 100) {
      // Only track unclassified chats with significant activity
      unclassifiedChats.push({
        id: chat._id,
        name: chatName,
        messageCount: chat.messageCount,
      });
    }
  }

  // Build segment reports
  const segments: CommunitySegment[] = [];

  for (const segmentDef of SEGMENT_PATTERNS) {
    const chats = segmentChats[segmentDef.id] || [];
    if (chats.length === 0) continue;

    const chatIds = chats.map(c => c.id);
    const chatIdList = chatIds.join(",");

    // Get total messages for segment
    const msgCountQuery = `
      SELECT COUNT(*) as count FROM message
      WHERE chat_row_id IN (${chatIdList})
        AND text_data IS NOT NULL
    `;
    const msgResult = db.query<{ count: number }, []>(msgCountQuery).get();
    const totalMessages = msgResult?.count ?? 0;

    // Get active users count
    const usersQuery = `
      SELECT COUNT(DISTINCT sender_jid_row_id) as count FROM message
      WHERE chat_row_id IN (${chatIdList})
        AND from_me = 0
    `;
    const usersResult = db.query<{ count: number }, []>(usersQuery).get();
    const activeUsers = usersResult?.count ?? 0;

    // Count keywords
    const keywordCounts: Array<{ keyword: string; count: number }> = [];
    for (const keyword of segmentDef.keywords) {
      const kwQuery = `
        SELECT COUNT(*) as count FROM message
        WHERE chat_row_id IN (${chatIdList})
          AND text_data IS NOT NULL
          AND LOWER(text_data) LIKE '%${keyword}%'
      `;
      const kwResult = db.query<{ count: number }, []>(kwQuery).get();
      keywordCounts.push({ keyword, count: kwResult?.count ?? 0 });
    }
    keywordCounts.sort((a, b) => b.count - a.count);

    // Generate characteristics
    const characteristics: string[] = [];
    const avgMsgsPerChat = totalMessages / chats.length;
    if (avgMsgsPerChat > 5000) {
      characteristics.push("Alta actividad");
    } else if (avgMsgsPerChat > 1000) {
      characteristics.push("Actividad moderada");
    } else {
      characteristics.push("Baja actividad");
    }

    if (activeUsers > 500) {
      characteristics.push("Comunidad grande");
    } else if (activeUsers > 100) {
      characteristics.push("Comunidad mediana");
    }

    segments.push({
      id: segmentDef.id,
      name: segmentDef.name,
      description: segmentDef.description,
      chatIds,
      chatNames: chats.map(c => c.name),
      totalMessages,
      activeUsers,
      topKeywords: keywordCounts.slice(0, 5),
      characteristics,
    });
  }

  // Sort segments by total messages
  segments.sort((a, b) => b.totalMessages - a.totalMessages);

  // Sort unclassified by message count
  unclassifiedChats.sort((a, b) => b.messageCount - a.messageCount);

  // Calculate totals
  const totalChats = filteredChats.length;
  const totalMessages = segments.reduce((sum, s) => sum + s.totalMessages, 0);

  // Generate insights
  const insights: string[] = [];

  if (segments.length > 0) {
    const topSegment = segments[0];
    insights.push(`${topSegment.name} es el segmento más activo con ${topSegment.totalMessages.toLocaleString()} mensajes`);
  }

  const classifiedCount = segments.reduce((sum, s) => sum + s.chatIds.length, 0);
  const classificationRate = Math.round((classifiedCount / totalChats) * 100);
  insights.push(`${classificationRate}% de los grupos fueron clasificados en segmentos`);

  // Find segment with most users
  const mostUsers = segments.reduce((max, s) => s.activeUsers > max.activeUsers ? s : max, segments[0]);
  if (mostUsers) {
    insights.push(`${mostUsers.name} tiene la comunidad más grande con ${mostUsers.activeUsers.toLocaleString()} usuarios activos`);
  }

  return {
    generatedAt: new Date().toISOString(),
    totalChats,
    totalMessages,
    segments,
    unclassifiedChats: unclassifiedChats.slice(0, 20), // Top 20 unclassified
    insights,
  };
}
