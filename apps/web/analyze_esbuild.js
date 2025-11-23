const fs = require('fs');

try {
  const stats = JSON.parse(fs.readFileSync('dist/web/stats.json', 'utf8'));
  const outputs = stats.outputs || {};

  let shepherdChunk = null;
  let mainBundle = null;
  let mapboxChunk = null;

  Object.entries(outputs).forEach(([chunkName, data]) => {
    if (chunkName.endsWith('.map')) return;

    const isMain = chunkName.includes('main');
    if (isMain) mainBundle = chunkName;

    const inputs = data.inputs || {};
    const inputFiles = Object.keys(inputs);

    const hasShepherd = inputFiles.some(f => f.includes('shepherd.js'));
    const hasMapbox = inputFiles.some(f => f.includes('mapbox-gl'));

    if (hasShepherd) {
      console.log(`Found shepherd.js in: ${chunkName} (${(data.bytes / 1024).toFixed(2)} KB)`);
      shepherdChunk = chunkName;
    }

    if (hasMapbox) {
      console.log(`Found mapbox-gl in: ${chunkName} (${(data.bytes / 1024).toFixed(2)} KB)`);
      mapboxChunk = chunkName;
    }
  });

  if (mainBundle) {
    console.log(`Main bundle: ${mainBundle}`);
    const mainData = outputs[mainBundle];
    const mainHasShepherd = Object.keys(mainData.inputs).some(f => f.includes('shepherd.js'));
    if (mainHasShepherd) {
      console.error('❌ CRITICAL: shepherd.js is in the MAIN bundle!');
    } else {
      console.log('✅ shepherd.js is NOT in the main bundle.');
    }
  } else {
    console.log('Could not identify main bundle.');
  }

} catch (e) {
  console.error('Error:', e);
}
