const path = require('path');
const fs = require('fs');

const mapPath = path.resolve(__dirname, '../../tests/selector-map.json');
if (!fs.existsSync(mapPath)) {
  console.warn('Selector map not found at', mapPath);
  module.exports = { s: (k) => k, selectors: {} };
} else {
  const full = require(mapPath);
  const firstKey = Object.keys(full)[0];
  const selectors = full[firstKey] ? full[firstKey].selectors : {};

  function s(key) {
    // return the concrete CSS selector for a given candidate key
    if (!key) return '';
    if (selectors && selectors[key] && selectors[key].selector) return selectors[key].selector;
    // if key doesn't exist, assume it's already a selector
    return key;
  }

  module.exports = { s, selectors };
}
