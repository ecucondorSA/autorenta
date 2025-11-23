const fs = require('fs');

try {
  const stats = JSON.parse(fs.readFileSync('dist/web/stats.json', 'utf8'));

  // Handle different stats formats (webpack vs esbuild/angular-cli)
  const chunks = stats.chunks || [];
  const assets = stats.assets || [];

  console.log(`Total chunks: ${chunks.length}`);
  console.log(`Total assets: ${assets.length}`);

  // Find the largest assets
  const largeAssets = assets
    .filter(a => a.name.endsWith('.js'))
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  console.log('\nTop 10 Largest Assets:');
  largeAssets.forEach(asset => {
    console.log(`${asset.name}: ${(asset.size / 1024 / 1024).toFixed(2)} MB`);
  });

  // Try to map assets to chunks and modules
  // Note: Angular CLI's esbuild stats might differ from webpack's

  // If we have named chunks, let's look at them
  if (chunks.length > 0) {
    console.log('\nAnalyzing Chunks...');

    // Create a map of chunk id to modules
    chunks.forEach(chunk => {
      const size = chunk.size || (chunk.sizes ? Object.values(chunk.sizes).reduce((a, b) => a + b, 0) : 0);
      if (size > 100000) { // > 100KB
        console.log(`\nChunk ${chunk.id} (${chunk.names ? chunk.names.join(', ') : 'unnamed'}) - ${(size / 1024 / 1024).toFixed(2)} MB`);

        // In webpack stats, modules are usually under 'modules'
        if (chunk.modules) {
          const topModules = chunk.modules
            .sort((a, b) => b.size - a.size)
            .slice(0, 5);

          topModules.forEach(mod => {
            console.log(`  - ${mod.name}: ${(mod.size / 1024).toFixed(2)} KB`);
          });
        }
      }
    });
  } else {
    console.log('\nNo chunks information found in stats.json (might be esbuild format)');
    // If esbuild, we might need to look at 'assets' and see if they have 'inputs' (metafile style) but stats.json from angular might be different.
  }

} catch (e) {
  console.error('Error parsing stats.json:', e);
}
