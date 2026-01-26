#!/usr/bin/env node

/**
 * Consolidates all console.* statements to LoggerService
 * Replaces console.log/warn/error with proper logger service calls
 * Automatically injects LoggerService where needed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const APP_DIR = '/home/edu/autorenta/apps/web/src/app';

// Statistics
let stats = {
  filesProcessed: 0,
  consoleStatementsRemoved: 0,
  loggerInjected: 0,
  importsAdded: 0,
  errors: []
};

// File patterns to exclude
const EXCLUDE_PATTERNS = [
  /\.spec\.ts$/,
  /node_modules/,
  /\.test\.ts$/
];

/**
 * Get all TypeScript files
 */
function getTypeScriptFiles(dir) {
  const files = [];

  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          walk(fullPath);
        }
      } else if (entry.name.endsWith('.ts') && !EXCLUDE_PATTERNS.some(p => p.test(fullPath))) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Check if file has console statements
 */
function hasConsoleStatements(content) {
  return /console\.(log|warn|error|debug|info)\s*\(/.test(content);
}

/**
 * Check if LoggerService is already imported
 */
function hasLoggerImport(content) {
  return /import.*LoggerService.*from.*logger\.service/.test(content);
}

/**
 * Check if LoggerService is already injected
 */
function hasLoggerInjected(content) {
  return /private\s+readonly\s+logger\s*[:=].*LoggerService|inject\(LoggerService\)/.test(content);
}

/**
 * Check if file is a service
 */
function isService(filePath) {
  return /\.service\.ts$/.test(filePath);
}

/**
 * Check if file is a component
 */
function isComponent(filePath) {
  return /\.component\.ts$/.test(filePath);
}

/**
 * Get the relative import path for LoggerService
 */
function getLoggerImportPath(filePath) {
  const fileDir = path.dirname(filePath);
  const loggerPath = path.join(APP_DIR, 'core/services/logger.service');

  const relativePath = path.relative(fileDir, loggerPath);
  return relativePath.replace(/\\/g, '/');
}

/**
 * Add LoggerService import if missing
 */
function addLoggerImport(content, filePath) {
  if (hasLoggerImport(content)) {
    return content;
  }

  const importPath = getLoggerImportPath(filePath);
  const loggerImport = `import { LoggerService } from '${importPath}';\n`;

  // Find the last import statement
  const lastImportMatch = content.match(/^import\s+.*?;/gm);
  if (!lastImportMatch || lastImportMatch.length === 0) {
    // No imports yet, add at the very beginning
    return loggerImport + '\n' + content;
  }

  const lastImport = lastImportMatch[lastImportMatch.length - 1];
  const insertPos = content.indexOf(lastImport) + lastImport.length;

  return content.slice(0, insertPos) + '\n' + loggerImport + content.slice(insertPos);
}

/**
 * Inject LoggerService into component/service
 */
function injectLogger(content, filePath) {
  if (hasLoggerInjected(content)) {
    return content;
  }

  // For services: add to constructor
  if (isService(filePath)) {
    // Check if there's a constructor
    if (/constructor\s*\(/.test(content)) {
      // Add logger as first parameter
      return content.replace(
        /constructor\s*\(\s*([^)]*)\s*\)/,
        (match, params) => {
          const newParams = params.trim()
            ? `private readonly logger = inject(LoggerService), ${params}`
            : `private readonly logger = inject(LoggerService)`;
          return `constructor(${newParams})`;
        }
      );
    } else {
      // No constructor, add one
      const classMatch = content.match(/export\s+class\s+\w+/);
      if (classMatch) {
        const insertPos = content.indexOf(classMatch[0]) + classMatch[0].length;
        const restOfClass = content.indexOf('{', insertPos) + 1;
        return content.slice(0, restOfClass) +
               `\n  private readonly logger = inject(LoggerService);\n` +
               content.slice(restOfClass);
      }
    }
  }

  // For components: inject into constructor
  if (isComponent(filePath)) {
    if (/constructor\s*\(/.test(content)) {
      return content.replace(
        /constructor\s*\(\s*([^)]*)\s*\)/,
        (match, params) => {
          const newParams = params.trim()
            ? `private readonly logger = inject(LoggerService), ${params}`
            : `private readonly logger = inject(LoggerService)`;
          return `constructor(${newParams})`;
        }
      );
    }
  }

  return content;
}

/**
 * Replace console statements with logger calls
 */
function replaceConsoleStatements(content) {
  let modified = content;
  let count = 0;

  // Replace console.error -> logger.error
  modified = modified.replace(
    /console\.error\s*\(\s*(['"`])(.*?)\1\s*(?:,\s*([^)]*))?\s*\)/g,
    (match, quote, message, data) => {
      count++;
      if (data) {
        return `this.logger.error('${message}', ${data.trim()})`;
      }
      return `this.logger.error('${message}')`;
    }
  );

  // Replace console.warn -> logger.warn
  modified = modified.replace(
    /console\.warn\s*\(\s*(['"`])(.*?)\1\s*(?:,\s*([^)]*))?\s*\)/g,
    (match, quote, message, data) => {
      count++;
      if (data) {
        return `this.logger.warn('${message}', ${data.trim()})`;
      }
      return `this.logger.warn('${message}')`;
    }
  );

  // Replace console.log -> logger.info
  modified = modified.replace(
    /console\.log\s*\(\s*(['"`])(.*?)\1\s*(?:,\s*([^)]*))?\s*\)/g,
    (match, quote, message, data) => {
      count++;
      if (data) {
        return `this.logger.info('${message}', ${data.trim()})`;
      }
      return `this.logger.info('${message}')`;
    }
  );

  // Replace console.debug -> logger.info
  modified = modified.replace(
    /console\.debug\s*\(\s*(['"`])(.*?)\1\s*(?:,\s*([^)]*))?\s*\)/g,
    (match, quote, message, data) => {
      count++;
      if (data) {
        return `this.logger.info('${message}', ${data.trim()})`;
      }
      return `this.logger.info('${message}')`;
    }
  );

  return { modified, count };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    if (!hasConsoleStatements(content)) {
      return false;
    }

    // Only process services and components for now
    if (!isService(filePath) && !isComponent(filePath)) {
      return false;
    }

    // Add logger import
    content = addLoggerImport(content, filePath);

    // Inject logger
    content = injectLogger(content, filePath);

    // Replace console statements
    const { modified, count } = replaceConsoleStatements(content);

    if (count > 0) {
      fs.writeFileSync(filePath, modified, 'utf8');
      stats.consoleStatementsRemoved += count;
      stats.filesProcessed++;

      if (hasLoggerImport(modified)) {
        stats.importsAdded++;
      }
      if (hasLoggerInjected(modified)) {
        stats.loggerInjected++;
      }

      return true;
    }

    return false;
  } catch (error) {
    stats.errors.push({ filePath, error: error.message });
    return false;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning for console statements...\n');

  const files = getTypeScriptFiles(APP_DIR);
  console.log(`📊 Found ${files.length} TypeScript files to scan\n`);

  let filesModified = 0;

  for (const filePath of files) {
    if (processFile(filePath)) {
      filesModified++;
      const relative = path.relative(APP_DIR, filePath);
      console.log(`✅ ${relative}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 CONSOLIDATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Files processed:             ${stats.filesProcessed}`);
  console.log(`✅ Console statements removed: ${stats.consoleStatementsRemoved}`);
  console.log(`✅ LoggerService injected:     ${stats.loggerInjected}`);
  console.log(`✅ Imports added:              ${stats.importsAdded}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach(err => {
      console.log(`  - ${err.filePath}: ${err.error}`);
    });
  }

  console.log('\n💡 Next Steps:');
  console.log('  1. Review the changes in git diff');
  console.log('  2. Run: npm run build');
  console.log('  3. Run: npm test');
  console.log('  4. Commit the changes');
}

main();
