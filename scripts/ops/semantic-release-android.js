#!/usr/bin/env node

/**
 * Semantic Release Android Hook
 *
 * Automatically updates Android versionCode and versionName based on semantic versioning
 *
 * Usage: node semantic-release-android.js <version>
 * Example: node semantic-release-android.js 1.0.12
 */

const fs = require('fs');
const path = require('path');

const VERSION = process.argv[2];

if (!VERSION) {
  console.error('❌ Error: Version argument required');
  console.error('Usage: node semantic-release-android.js <version>');
  process.exit(1);
}

const BUILD_GRADLE_PATH = path.join(
  __dirname,
  '../apps/web/android/app/build.gradle'
);

console.log(`\n📱 Updating Android Version Code...`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

try {
  // Read current build.gradle
  let content = fs.readFileSync(BUILD_GRADLE_PATH, 'utf-8');

  // Extract current versionCode
  const codeMatch = content.match(/versionCode\s+(\d+)/);
  const currentCode = codeMatch ? parseInt(codeMatch[1]) : 0;
  const nextCode = currentCode + 1;

  // Extract current versionName
  const nameMatch = content.match(/versionName\s+"([^"]+)"/);
  const currentName = nameMatch ? nameMatch[1] : 'unknown';

  console.log(`\nCurrent state:`);
  console.log(`  versionCode: ${currentCode}`);
  console.log(`  versionName: ${currentName}`);

  // Update versionCode and versionName
  content = content.replace(
    /versionCode\s+\d+/,
    `versionCode ${nextCode}`
  );

  content = content.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${VERSION}"`
  );

  // Write back to file
  fs.writeFileSync(BUILD_GRADLE_PATH, content, 'utf-8');

  // Verify the update
  const verifyContent = fs.readFileSync(BUILD_GRADLE_PATH, 'utf-8');
  const verifyCodeMatch = verifyContent.match(/versionCode\s+(\d+)/);
  const verifyNameMatch = verifyContent.match(/versionName\s+"([^"]+)"/);

  const verifyCode = verifyCodeMatch ? parseInt(verifyCodeMatch[1]) : 0;
  const verifyName = verifyNameMatch ? verifyNameMatch[1] : 'unknown';

  if (verifyCode === nextCode && verifyName === VERSION) {
    console.log(`\nUpdated to:`);
    console.log(`  ✅ versionCode: ${currentCode} → ${nextCode}`);
    console.log(`  ✅ versionName: ${currentName} → ${VERSION}`);
    console.log(`\n✅ Android version updated successfully`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    process.exit(0);
  } else {
    throw new Error(`Verification failed: ${verifyCode} ${verifyName}`);
  }
} catch (error) {
  console.error(`\n❌ Error updating Android version:`);
  console.error(`  ${error.message}`);
  console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  process.exit(1);
}
