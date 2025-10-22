#!/usr/bin/env node
/**
 * Generate PWA icons from logo
 * Uses Sharp for image resizing
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE_LOGO = join(__dirname, '../src/assets/images/autorentar-logo.png');
const ICONS_DIR = join(__dirname, '../src/icons');

// Icon sizes needed for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Shortcut icon sizes
const SHORTCUT_ICONS = [
  { name: 'shortcut-search.png', emoji: '🔍', size: 96 },
  { name: 'shortcut-bookings.png', emoji: '📅', size: 96 },
  { name: 'shortcut-wallet.png', emoji: '💳', size: 96 },
  { name: 'shortcut-publish.png', emoji: '🚗', size: 96 },
];

async function generateIcons() {
  try {
    console.log('📦 Creating icons directory...');
    await mkdir(ICONS_DIR, { recursive: true });

    console.log('🎨 Generating PWA icons...');

    // Generate main app icons
    for (const size of ICON_SIZES) {
      const outputPath = join(ICONS_DIR, `icon-${size}x${size}.png`);

      await sharp(SOURCE_LOGO)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 128, g: 90, b: 213, alpha: 1 }, // #805ad5 (theme color)
        })
        .png()
        .toFile(outputPath);

      console.log(`  ✅ Generated icon-${size}x${size}.png`);
    }

    console.log('\\n🎯 Generating shortcut icons...');

    // For shortcuts, we'll create simple colored squares with the logo
    // In a real scenario, you'd want custom designs for each
    for (const shortcut of SHORTCUT_ICONS) {
      const outputPath = join(ICONS_DIR, shortcut.name);

      await sharp(SOURCE_LOGO)
        .resize(shortcut.size, shortcut.size, {
          fit: 'contain',
          background: { r: 128, g: 90, b: 213, alpha: 1 },
        })
        .png()
        .toFile(outputPath);

      console.log(`  ✅ Generated ${shortcut.name}`);
    }

    console.log('\\n✨ PWA icons generated successfully!');
    console.log(`📁 Location: ${ICONS_DIR}`);
    console.log('\\n📝 Next steps:');
    console.log('   1. Review generated icons');
    console.log('   2. Build the app: npm run build');
    console.log('   3. Icons will be included in production build');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
