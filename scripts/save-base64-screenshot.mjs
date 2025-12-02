#!/usr/bin/env node
// This script reads base64 from stdin and saves as PNG
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const outputPath = process.argv[2] || './screenshots/screenshot.png';

let data = '';
process.stdin.on('data', chunk => { data += chunk; });
process.stdin.on('end', () => {
  // Remove data:image/png;base64, prefix if present
  const base64 = data.replace(/^data:image\/\w+;base64,/, '').trim();
  const buffer = Buffer.from(base64, 'base64');
  writeFileSync(resolve(outputPath), buffer);
  console.log(`Saved to: ${resolve(outputPath)} (${buffer.length} bytes)`);
});
