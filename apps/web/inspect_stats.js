const fs = require('fs');

try {
  const stats = JSON.parse(fs.readFileSync('dist/web/stats.json', 'utf8'));
  console.log('Keys:', Object.keys(stats));

  if (stats.outputs) {
    console.log('Found "outputs" key. Sample output keys:', Object.keys(stats.outputs).slice(0, 5));
  }
  if (stats.assets) {
    console.log('Found "assets" key.');
  }
  if (stats.chunks) {
    console.log('Found "chunks" key.');
  }

} catch (e) {
  console.error('Error:', e);
}
