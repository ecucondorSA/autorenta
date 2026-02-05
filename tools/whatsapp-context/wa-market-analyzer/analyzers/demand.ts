/**
 * Demand Analysis - Supply/Demand Gap Calculator
 */
import { getDb } from "../lib/db";
import { getBiasFilterClause, EXCLUDED_CHAT_IDS } from "../lib/filters";
import {
  CATEGORIES,
  Category,
  getDemandConditions,
  getSupplyConditions,
} from "../lib/categories";
import { extractPrices, PriceInfo } from "../lib/extractors";

export interface CategoryDemandReport {
  categoryId: string;
  categoryName: string;
  emoji: string;
  demandMentions: number;
  supplyMentions: number;
  gapRatio: number;
  opportunity: "HIGH" | "MEDIUM" | "LOW" | "SATURATED";
  topKeywords: Array<{ keyword: string; count: number }>;
  priceRange: {
    min: number | null;
    max: number | null;
    avg: number | null;
    currency: string;
    samples: number;
  };
  sampleDemandMessages: string[];
  sampleSupplyMessages: string[];
}

export interface DemandReport {
  generatedAt: string;
  biasFilterApplied: boolean;
  excludedChats: number[];
  totalMessagesAnalyzed: number;
  categories: CategoryDemandReport[];
}

/**
 * Analyze demand for a single category
 */
function analyzeCategory(category: Category): CategoryDemandReport {
  const db = getDb();
  const biasFilter = getBiasFilterClause();

  // Count demand mentions
  const demandConditions = getDemandConditions(category);
  const demandQuery = `
    SELECT COUNT(*) as count FROM message
    WHERE text_data IS NOT NULL
      AND LENGTH(text_data) > 15
      AND ${biasFilter}
      AND (${demandConditions})
  `;
  const demandResult = db.query<{ count: number }, []>(demandQuery).get();
  const demandMentions = demandResult?.count ?? 0;

  // Count supply mentions
  const supplyConditions = getSupplyConditions(category);
  const supplyQuery = `
    SELECT COUNT(*) as count FROM message
    WHERE text_data IS NOT NULL
      AND LENGTH(text_data) > 15
      AND ${biasFilter}
      AND (${supplyConditions})
  `;
  const supplyResult = db.query<{ count: number }, []>(supplyQuery).get();
  const supplyMentions = supplyResult?.count ?? 0;

  console.log(`    (Demand: ${demandMentions}, Supply: ${supplyMentions}, Ratio: ${(demandMentions / (supplyMentions || 1)).toFixed(2)}x)`);

  // Calculate gap ratio
  const gapRatio = supplyMentions > 0 ? demandMentions / supplyMentions : demandMentions > 0 ? 999 : 0;

  // Determine opportunity level
  let opportunity: CategoryDemandReport["opportunity"];
  if (gapRatio >= 2) opportunity = "HIGH";
  else if (gapRatio >= 1) opportunity = "MEDIUM";
  else if (gapRatio >= 0.5) opportunity = "LOW";
  else opportunity = "SATURATED";

  // Get sample demand messages
  const sampleDemandQuery = `
    SELECT text_data FROM message
    WHERE text_data IS NOT NULL
      AND LENGTH(text_data) > 30
      AND LENGTH(text_data) < 500
      AND ${biasFilter}
      AND (${demandConditions})
    ORDER BY RANDOM()
    LIMIT 5
  `;
  const sampleDemandMessages = db.query<{ text_data: string }, []>(sampleDemandQuery)
    .all()
    .map(r => r.text_data);

  // Get sample supply messages
  const sampleSupplyQuery = `
    SELECT text_data FROM message
    WHERE text_data IS NOT NULL
      AND LENGTH(text_data) > 30
      AND LENGTH(text_data) < 500
      AND ${biasFilter}
      AND (${supplyConditions})
    ORDER BY RANDOM()
    LIMIT 5
  `;
  const sampleSupplyMessages = db.query<{ text_data: string }, []>(sampleSupplyQuery)
    .all()
    .map(r => r.text_data);

  // Analyze prices from supply messages
  const pricesQuery = `
    SELECT text_data FROM message
    WHERE text_data IS NOT NULL
      AND ${biasFilter}
      AND (${supplyConditions})
    LIMIT 500
  `;
  const priceMessages = db.query<{ text_data: string }, []>(pricesQuery).all();

  const allPrices: PriceInfo[] = [];
  for (const msg of priceMessages) {
    const prices = extractPrices(msg.text_data);
    allPrices.push(...prices);
  }

  // Filter to USD prices for consistency
  const usdPrices = allPrices.filter(p => p.currency === "USD").map(p => p.amount);
  const arsPrices = allPrices.filter(p => p.currency === "ARS").map(p => p.amount);

  // Use USD if available, else ARS
  const pricesToUse = usdPrices.length > 0 ? usdPrices : arsPrices;
  const currency = usdPrices.length > 0 ? "USD" : arsPrices.length > 0 ? "ARS" : "UNKNOWN";

  const priceRange = {
    min: pricesToUse.length > 0 ? Math.min(...pricesToUse) : null,
    max: pricesToUse.length > 0 ? Math.max(...pricesToUse) : null,
    avg: pricesToUse.length > 0 ? Math.round(pricesToUse.reduce((a, b) => a + b, 0) / pricesToUse.length) : null,
    currency,
    samples: pricesToUse.length,
  };

  // Count keyword frequency
  const keywordCounts: Record<string, number> = {};
  for (const kw of [...category.demandKeywords, ...category.supplyKeywords, ...category.contextKeywords]) {
    const countQuery = `
      SELECT COUNT(*) as count FROM message
      WHERE text_data IS NOT NULL
        AND ${biasFilter}
        AND LOWER(text_data) LIKE '%${kw}%'
    `;
    const result = db.query<{ count: number }, []>(countQuery).get();
    keywordCounts[kw] = result?.count ?? 0;
  }

  const topKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  return {
    categoryId: category.id,
    categoryName: category.name,
    emoji: category.emoji,
    demandMentions,
    supplyMentions,
    gapRatio: Math.round(gapRatio * 100) / 100,
    opportunity,
    topKeywords,
    priceRange,
    sampleDemandMessages,
    sampleSupplyMessages,
  };
}

/**
 * Run full demand analysis across all categories
 */
export function analyzeDemand(): DemandReport {
  const db = getDb();
  const biasFilter = getBiasFilterClause();

  console.log("  Fetching total messages...");
  // Get total messages analyzed
  const totalQuery = `
    SELECT COUNT(*) as count FROM message
    WHERE text_data IS NOT NULL AND ${biasFilter}
  `;
  const totalResult = db.query<{ count: number }, []>(totalQuery).get();
  const totalMessagesAnalyzed = totalResult?.count ?? 0;
  console.log(`  Total messages to analyze (after filters): ${totalMessagesAnalyzed.toLocaleString()}`);

  // Analyze each category
  const categories: CategoryDemandReport[] = [];
  for (const cat of CATEGORIES) {
    console.log(`  - Analyzing ${cat.emoji} ${cat.name}...`);
    categories.push(analyzeCategory(cat));
  }

  // Sort by opportunity (HIGH first) then by gap ratio
  categories.sort((a, b) => {
    const opportunityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, SATURATED: 3 };
    if (opportunityOrder[a.opportunity] !== opportunityOrder[b.opportunity]) {
      return opportunityOrder[a.opportunity] - opportunityOrder[b.opportunity];
    }
    return b.gapRatio - a.gapRatio;
  });

  return {
    generatedAt: new Date().toISOString(),
    biasFilterApplied: true,
    excludedChats: EXCLUDED_CHAT_IDS,
    totalMessagesAnalyzed,
    categories,
  };
}

/**
 * Analyze demand for a specific category
 */
export function analyzeCategoryDemand(categoryId: string): CategoryDemandReport | null {
  const category = CATEGORIES.find(c => c.id === categoryId);
  if (!category) return null;
  return analyzeCategory(category);
}
