const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const servicesDir = path.join(rootDir, 'src/app/core/services');

// 1. Map all services to their subdirs
const serviceMap = {};
const subdirs = fs.readdirSync(servicesDir).filter(f => fs.statSync(path.join(servicesDir, f)).isDirectory());

subdirs.forEach(subdir => {
  const subdirPath = path.join(servicesDir, subdir);
  fs.readdirSync(subdirPath).forEach(file => {
    if (file.endsWith('.ts')) {
      const baseName = file.replace('.ts', '');
      serviceMap[baseName] = subdir;
    }
  });
});

console.log('Service Map initialized.');

const coreFolders = [
  'animations', 'config', 'constants', 'contracts', 'database',
  'decorators', 'directives', 'guards', 'guided-tour', 'interceptors',
  'interfaces', 'models', 'repositories', 'resolvers', 'services',
  'stores', 'strategies', 'types', 'utils'
];

const coreFoldersJoined = coreFolders.join('|');

// 2. Fix imports in all files
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.html') || file.endsWith('.scss')) {
        results.push(file);
      }
    }
  });
  return results;
}

const allFiles = walk(path.join(rootDir, 'src'));
console.log(`Processing ${allFiles.length} files...`);

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let changed = false;

  // Pattern A: Match any import that goes through core/SERVICES
  // Normalize to @core/services/SUBDIR/SERVICE
  content = content.replace(/(['"])([^'"]*?core\/services\/)([^'"]+?)(['"])/g, (match, quoteOpen, prefix, servicePath, quoteClose) => {
    const parts = servicePath.split('/');
    const lastPart = parts[parts.length - 1].replace('.service', '').replace('.factory', '');

    // Find subdir in map
    let subdir = serviceMap[lastPart] || serviceMap[lastPart + '.service'] || serviceMap[lastPart + '.factory'];

    if (subdir) {
      changed = true;
      const fileName = parts[parts.length - 1];
      return `${quoteOpen}@core/services/${subdir}/${fileName}${quoteClose}`;
    }
    return match;
  });

  // Pattern B: Match any other core folder import (relative or absolute)
  // Normalize to @core/FOLDER/...
  const coreRegex = new RegExp(`(['"])([^'"]*?core\/)(${coreFoldersJoined})(\/)([^'"]+?)(['"])`, 'g');
  content = content.replace(coreRegex, (match, quoteOpen, prefix, folder, slash, rest, quoteClose) => {
    // Avoid double @core
    if (prefix.includes('@core')) return match;

    // Special case: if we are matching core/services here, Pattern A should have handled it if it was a service.
    // But if it's a subfolder in services (like @core/services/auth/...), Pattern A might not have matched if it didn't find the service in map.

    changed = true;
    return `${quoteOpen}@core/${folder}/${rest}${quoteClose}`;
  });

  // Pattern C: Fix environment imports
  content = content.replace(/(['"])([^'"]*?environments\/environment)(['"])/g, (match, quote1, path, quote2) => {
    if (path === '@environment') return match;
    changed = true;
    return `${quote1}@environment${quote2}`;
  });

  if (changed && content !== originalContent) {
    fs.writeFileSync(file, content);
  }
});

console.log('Done fixing imports.');
