/**
 * WhatsApp Market Analyzer - CLI Entry Point
 */
import { analyzeDemand, analyzeCategoryDemand } from "./analyzers/demand";
import { analyzeTemporal } from "./analyzers/temporal";
import { analyzeCommunity } from "./analyzers/community";
import { analyzeInfluencers } from "./analyzers/influencers";
import { analyzeGaps } from "./analyzers/gaps";
import { closeDb } from "./lib/db";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const OUTPUT_DIR = join(__dirname, "output");

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "--help";

  try {
    switch (command) {
      case "demand":
        await handleDemand(args.slice(1));
        break;
      case "temporal":
        await handleTemporal();
        break;
      case "community":
        await handleCommunity();
        break;
      case "influencers":
        await handleInfluencers(args.slice(1));
        break;
      case "opportunities":
      case "gaps":
        await handleGaps();
        break;
      case "--all":
        await handleAll();
        break;
      case "--help":
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error("Error during analysis:", error);
  } finally {
    closeDb();
  }
}

function showHelp() {
  console.log(`
WhatsApp Market Analyzer CLI
----------------------------
Usage:
  bun analyze.ts <command> [options]

Commands:
  demand          Analyze supply/demand across categories
    --category <id>  Analyze specific category
  temporal        Analyze message patterns over time
  community       Analyze segmentation by group type
  influencers     Analyze top sellers and active users
    --limit <n>      Limit number of influencers (default: 50)
  opportunities   Analyze market gaps and opportunities
  --all           Run all analyzers and generate full reports

Examples:
  bun analyze.ts demand --category vivienda
  bun analyze.ts influencers --limit 20
  bun analyze.ts --all
  `);
}

async function handleDemand(args: string[]) {
  const categoryIdx = args.indexOf("--category");
  const categoryId = categoryIdx !== -1 ? args[categoryIdx + 1] : null;

  if (categoryId) {
    console.log(`Analyzing demand for category: ${categoryId}...`);
    const report = analyzeCategoryDemand(categoryId);
    if (!report) {
      console.error(`Category not found: ${categoryId}`);
      return;
    }
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log("Analyzing demand across all categories...");
    const report = analyzeDemand();
    const outputPath = join(OUTPUT_DIR, "demand-report.json");
    writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report generated: ${outputPath}`);
    
    // Show summary
    console.table(report.categories.map(c => ({
      Category: c.categoryName,
      Demand: c.demandMentions,
      Supply: c.supplyMentions,
      Ratio: c.gapRatio,
      Opportunity: c.opportunity
    })));
  }
}

async function handleTemporal() {
  console.log("Analyzing temporal patterns...");
  const report = analyzeTemporal();
  const outputPath = join(OUTPUT_DIR, "temporal-report.json");
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Report generated: ${outputPath}`);
  
  console.log("\nInsights:");
  report.insights.forEach(i => console.log(`- ${i}`));
  
  console.log("\nPeak Hours:");
  console.table(report.peakWindows.map(w => ({
    Window: w.description,
    Count: w.peakCount
  })));
}

async function handleCommunity() {
  console.log("Analyzing community segments...");
  const report = analyzeCommunity();
  const outputPath = join(OUTPUT_DIR, "community-report.json");
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Report generated: ${outputPath}`);
  
  console.table(report.segments.map(s => ({
    Segment: s.name,
    Messages: s.totalMessages,
    Users: s.activeUsers,
    Characteristics: s.characteristics.join(", ")
  })));
}

async function handleInfluencers(args: string[]) {
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 50;

  console.log(`Analyzing top influencers (limit: ${limit})...`);
  const report = analyzeInfluencers(limit);
  const outputPath = join(OUTPUT_DIR, "influencers-report.json");
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Report generated: ${outputPath}`);
  
  console.log("\nTop Sellers:");
  console.table(report.topSellers.slice(0, 10).map(s => ({
    Phone: s.phoneNumber,
    Msgs: s.totalMessages,
    Groups: s.groupsActive,
    Categories: s.topCategories.map(c => c.category).join(", "),
    Score: s.activityScore
  })));
}

async function handleGaps() {
  console.log("Analyzing market gaps and opportunities...");
  const report = analyzeGaps();
  const outputPath = join(OUTPUT_DIR, "opportunities-report.json");
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Report generated: ${outputPath}`);
  
  console.log("\nHigh Priority Opportunities:");
  report.highPriority.forEach(o => {
    console.log(`\n[${o.category}] - ${o.type}`);
    console.log(`Insight: ${o.insight}`);
    console.log(`Recommendation: ${o.recommendation}`);
  });
  
  console.log("\nAction Items:");
  report.actionItems.forEach(a => console.log(`- ${a}`));
}

async function handleAll() {
  console.log("Running comprehensive market analysis...");
  
  console.log("1/5 Analyzing Demand...");
  const demand = analyzeDemand();
  writeFileSync(join(OUTPUT_DIR, "demand-report.json"), JSON.stringify(demand, null, 2));
  
  console.log("2/5 Analyzing Temporal Patterns...");
  const temporal = analyzeTemporal();
  writeFileSync(join(OUTPUT_DIR, "temporal-report.json"), JSON.stringify(temporal, null, 2));
  
  console.log("3/5 Analyzing Communities...");
  const community = analyzeCommunity();
  writeFileSync(join(OUTPUT_DIR, "community-report.json"), JSON.stringify(community, null, 2));
  
  console.log("4/5 Analyzing Influencers...");
  const influencers = analyzeInfluencers(100);
  writeFileSync(join(OUTPUT_DIR, "influencers-report.json"), JSON.stringify(influencers, null, 2));
  
  console.log("5/5 Analyzing Gaps & Opportunities...");
  const gaps = analyzeGaps();
  writeFileSync(join(OUTPUT_DIR, "opportunities-report.json"), JSON.stringify(gaps, null, 2));
  
  console.log("\nAnalysis Complete! Reports generated in tools/whatsapp-context/wa-market-analyzer/output/");
  
  console.log("\n--- MARKET SNAPSHOT ---");
  console.log(`Total Messages Analyzed: ${temporal.totalMessages.toLocaleString()}`);
  console.log(`Date Range: ${temporal.dateRange.earliest} to ${temporal.dateRange.latest}`);
  console.log(`Top Opportunity: ${gaps.marketSummary.topGapCategory}`);
  console.log(`Most Active Segment: ${gaps.marketSummary.mostActiveSegment}`);
  console.log("------------------------");
}

main();
