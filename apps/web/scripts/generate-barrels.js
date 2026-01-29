const fs = require('fs');
const path = require('path');

const servicesDir = path.resolve(__dirname, '../src/app/core/services');
const subdirs = fs.readdirSync(servicesDir).filter(f => fs.statSync(path.join(servicesDir, f)).isDirectory());

subdirs.forEach(subdir => {
  const subdirPath = path.join(servicesDir, subdir);
  const files = fs.readdirSync(subdirPath)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts' && !f.endsWith('.spec.ts'));

  const exports = files.map(f => `export * from './${f.replace('.ts', '')}';`).join('\n');
  fs.writeFileSync(path.join(subdirPath, 'index.ts'), exports + '\n');
  console.log(`Updated ${subdir}/index.ts`);
});
