const fs = require('fs');
const https = require('https');
const path = require('path');

const ASSETS_DIR = 'src/assets';

// --- SVG ICONS PATHS (Material Design / Heroicons style) ---
const ICONS = {
  bookings: '<path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5z" fill="currentColor"/>',
  messages: '<path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor"/>',
  notifications: '<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z" fill="currentColor"/>',
  wallet: '<path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor"/>',
  search: '<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>'
};

// --- DOWNLOAD TARGETS ---
const DOWNLOADS = [
  {
    url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200&auto=format&fit=crop',
    dest: 'images/ui/empty-search-street.webp' // Will likely be jpg content, but extension webp is fine for browser
  },
  {
    url: 'https://ui-avatars.com/api/?name=User&background=random&color=fff&size=512', // Professional generic avatar
    dest: 'avatar-placeholder.png'
  }
];

// --- SVG GENERATOR ---
function generateSvg(type, iconPath) {
  return `
<svg width="400" height="300" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="#F8FAFC"/>
  <circle cx="200" cy="150" r="80" fill="#E2E8F0"/>
  <circle cx="200" cy="150" r="60" fill="#CBD5E1"/>
  <g transform="translate(164, 114) scale(3)" style="color: #64748B">
    ${iconPath}
  </g>
  <defs>
    <linearGradient id="paint0_linear" x1="200" y1="0" x2="200" y2="300" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F1F5F9"/>
      <stop offset="1" stop-color="#E2E8F0"/>
    </linearGradient>
  </defs>
</svg>`;
}

const SVGS_TO_GENERATE = [
  { dest: 'images/empty-states/empty-bookings.svg', icon: ICONS.bookings },
  { dest: 'images/empty-states/empty-messages.svg', icon: ICONS.messages },
  { dest: 'images/empty-states/empty-notifications.svg', icon: ICONS.notifications },
  { dest: 'images/empty-states/empty-wallet.svg', icon: ICONS.wallet },
  { dest: 'images/empty-states/empty-search.svg', icon: ICONS.search },
];

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(ASSETS_DIR, destPath);
    // Ensure dir
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    
    const file = fs.createWriteStream(fullPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded: ${destPath}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(fullPath, () => {});
      console.error(`❌ Error downloading ${destPath}: ${err.message}`);
      reject(err);
    });
  });
}

function writeSvg(item) {
  const fullPath = path.join(ASSETS_DIR, item.dest);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, generateSvg('default', item.icon));
  console.log(`✅ Generated SVG: ${item.dest}`);
}

async function main() {
  console.log('🚀 Generating assets...');
  
  // 1. Generate SVGs
  SVGS_TO_GENERATE.forEach(writeSvg);

  // 2. Download Images
  for (const item of DOWNLOADS) {
    try {
      await downloadFile(item.url, item.dest);
    } catch (e) {
      // ignore
    }
  }
  
  console.log('✨ Assets generation complete.');
}

main();
