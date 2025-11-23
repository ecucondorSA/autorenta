const fs = require('fs');

try {
  const stats = JSON.parse(fs.readFileSync('dist/web/stats.json', 'utf8'));

  const outputs = stats.outputs || {};

  // Convert to array and sort by size
  const chunks = Object.entries(outputs)
    .filter(([name, data]) => name.endsWith('.js'))
    .map(([name, data]) => ({
      name,
      size: data.bytes,
      inputs: data.inputs
    }))
    .sort((a, b) => b.size - a.size);

  console.log(`Total chunks: ${chunks.length}`);

  console.log('\nTop 10 Largest Chunks:');
  chunks.slice(0, 10).forEach(chunk => {
    console.log(`\n${chunk.name}: ${(chunk.size / 1024 / 1024).toFixed(2)} MB`);

    if (chunk.inputs) {
      const inputs = Object.entries(chunk.inputs)
        .map(([name, data]) => ({
          name,
          size: data.bytesInOutput
        }))
        .sort((a, b) => b.size - a.size)
        .slice(0, 10);

      console.log('  Top contributors:');
      inputs.forEach(input => {
        console.log(`    - ${input.name}: ${(input.size / 1024).toFixed(2)} KB`);
      });
    }
  });

  console.log('\nSearching for shepherd.js...');
  chunks.forEach(chunk => {
    if (chunk.inputs) {
      const shepherd = Object.keys(chunk.inputs).find(k => k.includes('shepherd.js'));
      if (shepherd) {
        console.log(`Found shepherd.js in chunk: ${chunk.name} (${(chunk.size / 1024).toFixed(2)} KB)`);
        console.log(`  - ${shepherd}`);
      }
    }
  });

} catch (e) {
  console.error('Error parsing stats.json:', e);
}
