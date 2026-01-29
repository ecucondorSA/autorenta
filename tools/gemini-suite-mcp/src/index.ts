#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { encode } from '@toon-format/toon';
import { getGeminiClient } from './gemini-client.js';
import { registerCodeReviewTool, codeReviewToolSchema } from './tools/code-review.js';
import { registerTestGeneratorTool, testGeneratorToolSchema } from './tools/test-generator.js';
import { registerUIAnalyzerTool, uiAnalyzerToolSchema } from './tools/ui-analyzer.js';
import { registerCodeCompareTool, codeCompareToolSchema } from './tools/code-compare.js';

// Tool handlers map
const toolHandlers = new Map<string, (args: any) => Promise<any>>();

// Convert result to TOON if beneficial
function toCompactFormat(data: any): string {
  if (typeof data === 'string') return data;

  try {
    const jsonStr = JSON.stringify(data);
    const toonStr = encode(data);

    // Use TOON if it's at least 10% smaller
    if (toonStr.length < jsonStr.length * 0.9) {
      return toonStr;
    }
  } catch {
    // If TOON fails, fall back to JSON
  }

  return JSON.stringify(data);
}

async function main() {
  console.error('Starting Gemini Suite MCP Server (TOON-enabled)...');

  const gemini = getGeminiClient();
  console.error('Gemini client initialized');

  const server = new Server(
    { name: 'gemini-suite', version: '1.1.0' },
    { capabilities: { tools: {} } }
  );

  // Register tools
  registerCodeReviewTool(gemini, toolHandlers);
  registerTestGeneratorTool(gemini, toolHandlers);
  registerUIAnalyzerTool(gemini, toolHandlers);
  registerCodeCompareTool(gemini, toolHandlers);

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      codeReviewToolSchema,
      testGeneratorToolSchema,
      uiAnalyzerToolSchema,
      codeCompareToolSchema,
    ],
  }));

  // Call tool - returns TOON format for compact responses
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = toolHandlers.get(name);

    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      const result = await handler(args || {});
      return {
        content: [{
          type: 'text',
          text: toCompactFormat(result),
        }],
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `ERROR: ${error instanceof Error ? error.message : String(error)}`,
        }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Gemini Suite MCP ready (TOON output enabled)');
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
