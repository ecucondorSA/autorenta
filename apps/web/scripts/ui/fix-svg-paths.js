const fs = require('fs');
const path = require('path');

const filePath = 'src/app/features/marketplace/marketplace-v2.page.html';
const content = fs.readFileSync(filePath, 'utf8');

// Regex para encontrar atributos d="..." que pueden tener saltos de línea
// Nota: Esto asume comillas dobles para d=""
const fixedContent = content.replace(/d="([^"]+)"/g, (match, dValue) => {
  // Eliminar saltos de línea y espacios extra resultantes del wrapping
  const cleanD = dValue.replace(/\n/g, '').replace(/\s+/g, ' ').trim();
  return `d="${cleanD}"`;
});

fs.writeFileSync(filePath, fixedContent);
console.log('Fixed SVG paths in:', filePath);
