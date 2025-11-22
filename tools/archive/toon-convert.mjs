#!/usr/bin/env node

/**
 * TOON Converter Tool
 *
 * Convierte JSON a TOON (Token-Oriented Object Notation)
 * Útil para optimizar tokens en MCP y prompts de Claude
 *
 * Uso:
 *   node tools/toon-convert.mjs input.json [output.toon]
 *   node tools/toon-convert.mjs .claude/config.json > .claude/config.toon
 *
 * @see https://github.com/toon-format/toon
 */

import { encode, decode } from '@toon-format/toon';
import fs from 'fs';
import path from 'path';

// Parse arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.error(`
TOON Converter - JSON ↔ TOON format conversion

Usage:
  json-to-toon <input-file> [output-file]

Examples:
  node tools/toon-convert.mjs input.json output.toon
  node tools/toon-convert.mjs .claude/config.json > .claude/config.toon
  node tools/toon-convert.mjs data.toon data.json

Options:
  --help, -h          Show this help message
  --validate, -v      Validate TOON format (encode then decode)
  --stats              Show file size statistics

Features:
  • Automatically detects input format (JSON or TOON)
  • Optimizes large arrays (30-60% token reduction)
  • Maintains data integrity (reversible conversion)
  • Pretty prints output for readability
`);
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];
const hasValidateFlag = args.includes('--validate') || args.includes('-v');
const hasStatsFlag = args.includes('--stats');

// Read input file
if (!fs.existsSync(inputFile)) {
  console.error(`Error: Input file not found: ${inputFile}`);
  process.exit(1);
}

let data;
const inputContent = fs.readFileSync(inputFile, 'utf-8');
const inputExt = path.extname(inputFile).toLowerCase();

// Detect and parse input format
try {
  if (inputExt === '.json') {
    data = JSON.parse(inputContent);
  } else if (inputExt === '.toon') {
    data = decode(inputContent);
  } else {
    // Try JSON first, then TOON
    try {
      data = JSON.parse(inputContent);
    } catch {
      data = decode(inputContent);
    }
  }
} catch (error) {
  console.error(`Error: Failed to parse input file: ${error.message}`);
  process.exit(1);
}

// Convert to target format
let output;
let targetFormat;

if (inputExt === '.json' || (inputExt !== '.toon' && args[1]?.endsWith('.toon'))) {
  // JSON → TOON
  try {
    output = encode(data);
    targetFormat = 'TOON';
  } catch (error) {
    console.error(`Error: Failed to encode to TOON: ${error.message}`);
    process.exit(1);
  }
} else {
  // TOON → JSON or JSON → JSON
  try {
    output = JSON.stringify(data, null, 2);
    targetFormat = 'JSON';
  } catch (error) {
    console.error(`Error: Failed to encode to JSON: ${error.message}`);
    process.exit(1);
  }
}

// Validate if requested
if (hasValidateFlag) {
  try {
    if (targetFormat === 'TOON') {
      const roundtrip = decode(output);
      if (JSON.stringify(roundtrip) !== JSON.stringify(data)) {
        console.error('Error: Roundtrip validation failed - data mismatch');
        process.exit(1);
      }
      console.error('✓ Validation passed - TOON format is reversible');
    } else {
      const roundtrip = JSON.parse(output);
      if (JSON.stringify(roundtrip) !== JSON.stringify(data)) {
        console.error('Error: Roundtrip validation failed - data mismatch');
        process.exit(1);
      }
      console.error('✓ Validation passed - JSON format is valid');
    }
  } catch (error) {
    console.error(`Error: Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Calculate statistics
if (hasStatsFlag) {
  const inputSize = inputContent.length;
  const outputSize = output.length;
  const reduction = ((1 - outputSize / inputSize) * 100).toFixed(1);

  console.error(`
Statistics:
  Input format:  ${inputExt === '.json' ? 'JSON' : 'TOON'}
  Output format: ${targetFormat}
  Input size:    ${inputSize} bytes
  Output size:   ${outputSize} bytes
  Reduction:     ${reduction}%

Note: Larger arrays benefit more from TOON (30-60% reduction)
`);
}

// Write output
if (outputFile) {
  try {
    fs.writeFileSync(outputFile, output, 'utf-8');
    console.error(`✓ Converted to ${targetFormat} and saved: ${outputFile}`);
  } catch (error) {
    console.error(`Error: Failed to write output file: ${error.message}`);
    process.exit(1);
  }
} else {
  // Write to stdout
  console.log(output);
}
