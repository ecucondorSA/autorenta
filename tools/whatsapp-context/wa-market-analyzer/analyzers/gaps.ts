/**
 * Gap Analysis - Market opportunities
 */
import { analyzeDemand, CategoryDemandReport } from "./demand";
import { analyzeCommunity, CommunitySegment } from "./community";
import { analyzeInfluencers } from "./influencers";

export interface Opportunity {
  id: string;
  category: string;
  type: "HIGH_DEMAND" | "UNDERSERVED" | "GROWING" | "NICHE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  insight: string;
  recommendation: string;
  metrics: Record<string, number | string>;
  targetSegments: string[];
}

export interface OpportunitiesReport {
  generatedAt: string;
  highPriority: Opportunity[];
  mediumPriority: Opportunity[];
  lowPriority: Opportunity[];
  marketSummary: {
    totalCategories: number;
    highOpportunityCount: number;
    saturatedCount: number;
    topGapCategory: string;
    mostActiveSegment: string;
  };
  actionItems: string[];
}

/**
 * Generate opportunity from demand data
 */
function generateDemandOpportunity(category: CategoryDemandReport): Opportunity | null {
  if (category.opportunity === "SATURATED") {
    return null;
  }

  let type: Opportunity["type"];
  let priority: Opportunity["priority"];
  let recommendation: string;

  if (category.gapRatio >= 3) {
    type = "HIGH_DEMAND";
    priority = "HIGH";
    recommendation = `Alta demanda insatisfecha. Conectar compradores con vendedores o crear marketplace especializado en ${category.categoryName.toLowerCase()}.`;
  } else if (category.gapRatio >= 2) {
    type = "UNDERSERVED";
    priority = "HIGH";
    recommendation = `Mercado subatendido. Oportunidad para nuevos vendedores en ${category.categoryName.toLowerCase()} o agregador de oferta.`;
  } else if (category.gapRatio >= 1.5) {
    type = "GROWING";
    priority = "MEDIUM";
    recommendation = `Demanda creciente. Monitorear y preparar oferta en ${category.categoryName.toLowerCase()}.`;
  } else {
    type = "NICHE";
    priority = "LOW";
    recommendation = `Nicho específico. Diferenciación por precio o calidad en ${category.categoryName.toLowerCase()}.`;
  }

  const insight = `${category.demandMentions.toLocaleString()} mensajes de demanda vs ${category.supplyMentions.toLocaleString()} de oferta (ratio ${category.gapRatio}x)`;

  return {
    id: `demand_${category.categoryId}`,
    category: category.categoryName,
    type,
    priority,
    insight,
    recommendation,
    metrics: {
      demandMentions: category.demandMentions,
      supplyMentions: category.supplyMentions,
      gapRatio: category.gapRatio,
      avgPrice: category.priceRange.avg ?? "N/A",
      priceCurrency: category.priceRange.currency,
    },
    targetSegments: [],
  };
}

/**
 * Generate cross-segment opportunity
 */
function generateSegmentOpportunity(
  segment: CommunitySegment,
  demandCategories: CategoryDemandReport[]
): Opportunity | null {
  // Find categories with high demand in this segment's keywords
  const segmentKeywords = segment.topKeywords.map(k => k.keyword.toLowerCase());

  // Match segment to demand categories
  for (const category of demandCategories) {
    if (category.opportunity !== "HIGH") continue;

    const categoryKeywords = category.topKeywords.map(k => k.keyword.toLowerCase());
    const overlap = segmentKeywords.filter(k => categoryKeywords.includes(k));

    if (overlap.length >= 2) {
      return {
        id: `segment_${segment.id}_${category.categoryId}`,
        category: category.categoryName,
        type: "NICHE",
        priority: "MEDIUM",
        insight: `${segment.name} tiene alta actividad en ${category.categoryName} con ${segment.activeUsers} usuarios activos`,
        recommendation: `Crear oferta especializada de ${category.categoryName.toLowerCase()} para comunidad ${segment.name}. Keywords comunes: ${overlap.join(", ")}`,
        metrics: {
          segmentUsers: segment.activeUsers,
          segmentMessages: segment.totalMessages,
          demandGap: category.gapRatio,
        },
        targetSegments: [segment.id],
      };
    }
  }

  return null;
}

/**
 * Analyze market gaps and opportunities
 */
export function analyzeGaps(): OpportunitiesReport {
  // Get underlying data
  const demandReport = analyzeDemand();
  const communityReport = analyzeCommunity();
  const influencersReport = analyzeInfluencers(20);

  const allOpportunities: Opportunity[] = [];

  // Generate demand-based opportunities
  for (const category of demandReport.categories) {
    const opportunity = generateDemandOpportunity(category);
    if (opportunity) {
      allOpportunities.push(opportunity);
    }
  }

  // Generate segment-based opportunities
  for (const segment of communityReport.segments) {
    const opportunity = generateSegmentOpportunity(segment, demandReport.categories);
    if (opportunity) {
      allOpportunities.push(opportunity);
    }
  }

  // Add influencer-based opportunity if there's concentration
  const topSellers = influencersReport.topSellers.slice(0, 10);
  const categoryConcentration: Record<string, number> = {};
  for (const seller of topSellers) {
    for (const cat of seller.topCategories) {
      categoryConcentration[cat.category] = (categoryConcentration[cat.category] || 0) + 1;
    }
  }

  const dominantCategory = Object.entries(categoryConcentration)
    .sort((a, b) => b[1] - a[1])[0];

  if (dominantCategory && dominantCategory[1] >= 5) {
    allOpportunities.push({
      id: "influencer_concentration",
      category: dominantCategory[0],
      type: "GROWING",
      priority: "MEDIUM",
      insight: `${dominantCategory[1]} de los top 10 vendedores se concentran en ${dominantCategory[0]}`,
      recommendation: `Mercado activo con vendedores establecidos. Considerar alianzas o programa de afiliados con top sellers.`,
      metrics: {
        topSellerCount: dominantCategory[1],
        totalTopSellers: topSellers.length,
      },
      targetSegments: [],
    });
  }

  // Sort and categorize by priority
  const highPriority = allOpportunities.filter(o => o.priority === "HIGH");
  const mediumPriority = allOpportunities.filter(o => o.priority === "MEDIUM");
  const lowPriority = allOpportunities.filter(o => o.priority === "LOW");

  // Build market summary
  const saturatedCount = demandReport.categories.filter(c => c.opportunity === "SATURATED").length;
  const highOpportunityCount = demandReport.categories.filter(c => c.opportunity === "HIGH").length;
  const topGapCategory = demandReport.categories[0]?.categoryName ?? "N/A";
  const mostActiveSegment = communityReport.segments[0]?.name ?? "N/A";

  // Generate action items
  const actionItems: string[] = [];

  if (highPriority.length > 0) {
    const topOpp = highPriority[0];
    actionItems.push(`🔴 ALTA PRIORIDAD: ${topOpp.category} - ${topOpp.recommendation}`);
  }

  if (highOpportunityCount >= 3) {
    actionItems.push(`📊 ${highOpportunityCount} categorías con alta demanda insatisfecha - considerar marketplace general`);
  }

  if (communityReport.segments.length > 0) {
    const topSegment = communityReport.segments[0];
    actionItems.push(`👥 Comunidad ${topSegment.name} (${topSegment.activeUsers} usuarios) es objetivo principal`);
  }

  if (influencersReport.topSellers.length > 0) {
    const topSeller = influencersReport.topSellers[0];
    actionItems.push(`🤝 Top vendedor: ${topSeller.phoneNumber} - potencial aliado/competidor`);
  }

  // Add spam warning if significant
  if (influencersReport.spamAccounts.length >= 10) {
    actionItems.push(`⚠️ ${influencersReport.spamAccounts.length} cuentas spam detectadas - oportunidad para plataforma verificada`);
  }

  return {
    generatedAt: new Date().toISOString(),
    highPriority,
    mediumPriority,
    lowPriority,
    marketSummary: {
      totalCategories: demandReport.categories.length,
      highOpportunityCount,
      saturatedCount,
      topGapCategory,
      mostActiveSegment,
    },
    actionItems,
  };
}
