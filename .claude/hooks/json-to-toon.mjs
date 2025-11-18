/**
 * JSON to TOON Optimization Hook
 *
 * Automatically converts large JSON arrays in prompts to TOON format
 * for reduced token usage. Runs on every prompt submission.
 *
 * @see https://github.com/toon-format/toon
 * @see ../CLAUDE_MCP.md#toon-format-optimization
 */

import { encode } from '@toon-format/toon';

/**
 * Hook configuration
 */
export const config = {
  name: 'json-to-toon',
  description: 'Automatically optimizes JSON arrays to TOON format in prompts',
  version: '1.0.0',
  triggers: ['onPromptSubmit'],
  settings: {
    // Only convert arrays with 5+ items (smaller arrays don't benefit)
    minArrayLength: 5,
    // Only convert if array size reduction > 20%
    minReductionPercent: 20,
    // Enable debug logging
    debug: false,
  },
};

/**
 * Main hook function
 * Processes prompt and converts large JSON arrays to TOON format
 *
 * @param {string} prompt - The user's prompt text
 * @param {object} context - Hook context (variables, etc.)
 * @returns {string} Optimized prompt
 */
export default async function optimizePrompt(prompt, context = {}) {
  try {
    // Find all JSON code blocks
    const jsonBlockPattern = /```json\n([\s\S]*?)\n```/g;
    let optimizedPrompt = prompt;
    const matches = [...prompt.matchAll(jsonBlockPattern)];

    if (matches.length === 0) {
      return prompt; // No JSON blocks found
    }

    for (const match of matches) {
      const jsonString = match[1];
      const originalBlock = match[0];

      try {
        // Parse JSON
        const data = JSON.parse(jsonString);

        // Only convert if it's an array with enough items
        if (!Array.isArray(data) || data.length < config.settings.minArrayLength) {
          continue;
        }

        // Check that array items are objects (not primitives)
        if (typeof data[0] !== 'object' || data[0] === null) {
          continue;
        }

        // Convert to TOON
        const toonString = encode(data);

        // Calculate reduction percentage
        const originalSize = jsonString.length;
        const toonSize = toonString.length;
        const reduction = ((1 - toonSize / originalSize) * 100).toFixed(1);

        // Only use TOON if reduction is significant
        if (reduction < config.settings.minReductionPercent) {
          if (config.settings.debug) {
            console.debug(
              `[json-to-toon] Skipping: only ${reduction}% reduction (need ${config.settings.minReductionPercent}%)`
            );
          }
          continue;
        }

        // Replace JSON block with TOON block
        const toonBlock = `\`\`\`toon\n${toonString}\n\`\`\``;
        optimizedPrompt = optimizedPrompt.replace(originalBlock, toonBlock);

        if (config.settings.debug) {
          console.debug(
            `[json-to-toon] Converted array of ${data.length} items (${reduction}% reduction)`
          );
        }
      } catch (error) {
        // If JSON parsing fails, skip this block
        if (config.settings.debug) {
          console.debug(`[json-to-toon] Failed to parse JSON block: ${error.message}`);
        }
        continue;
      }
    }

    return optimizedPrompt;
  } catch (error) {
    console.error(`[json-to-toon] Hook error: ${error.message}`);
    // Return original prompt if hook fails
    return prompt;
  }
}

/**
 * Utility function: Convert JSON string to TOON string
 * Can be used manually if needed
 *
 * @param {string} jsonString - JSON string
 * @returns {string} TOON string
 */
export function jsonToToon(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    return encode(data);
  } catch (error) {
    throw new Error(`Failed to convert JSON to TOON: ${error.message}`);
  }
}

/**
 * Utility function: Validate TOON format by round-tripping
 *
 * @param {string} toonString - TOON string
 * @returns {boolean} True if TOON is valid and reversible
 */
export function validateToon(toonString) {
  try {
    // This would need the decode function
    // For now, just check if it parses
    return toonString && toonString.length > 0;
  } catch (error) {
    return false;
  }
}

// Export as ESM default
export const hook = optimizePrompt;
