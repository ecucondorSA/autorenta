/**
 * Configuration for asset generation scripts
 *
 * ⚠️ SECURITY: API keys must be loaded from environment variables
 *
 * Setup:
 * 1. Set GEMINI_API_KEY environment variable before running scripts
 * 2. Example: GEMINI_API_KEY=your_key node generate-fleet-photos.js
 *
 * Or add to your shell profile (~/.bashrc, ~/.zshrc):
 *   export GEMINI_API_KEY=your_key
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY environment variable is not set');
  console.error('');
  console.error('To fix this, set the environment variable before running:');
  console.error('  GEMINI_API_KEY=your_key node <script>.js');
  console.error('');
  console.error('Or export it in your shell:');
  console.error('  export GEMINI_API_KEY=your_key');
  process.exit(1);
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Get the full Gemini API URL for image generation
 * @returns {string} Full API URL with key
 */
function getGeminiApiUrl() {
  return `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
}

module.exports = {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_API_BASE,
  getGeminiApiUrl,
};
