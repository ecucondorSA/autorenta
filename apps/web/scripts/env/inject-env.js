const fs = require('fs');
const path = require('path');

// Paths
const distHtmlPath = path.join(__dirname, '../../dist/web/browser/index.html');
const envJsPath = path.join(__dirname, '../../public/env.js');

function injectEnv() {
  if (!fs.existsSync(distHtmlPath)) {
    console.log('⚠️ dist/web/browser/index.html not found. Skipping env injection (this is expected in dev mode or pre-build).');
    return;
  }

  if (!fs.existsSync(envJsPath)) {
    console.error('❌ public/env.js not found. Run generate-env.js first.');
    process.exit(1);
  }

  console.log('💉 Injecting environment variables into index.html...');

  const htmlContent = fs.readFileSync(distHtmlPath, 'utf8');
  const envContent = fs.readFileSync(envJsPath, 'utf8');

  // Extract the JSON object from env.js (window.__env = { ... };)
  // We want to wrap it in a <script> tag
  const scriptTag = `<script>${envContent.trim()}</script>`;

  if (htmlContent.includes('<!-- __ENV_CONFIG__ -->')) {
    const newHtmlContent = htmlContent.replace('<!-- __ENV_CONFIG__ -->', scriptTag);
    fs.writeFileSync(distHtmlPath, newHtmlContent);
    console.log('✅ Environment variables injected successfully!');
  } else {
    console.warn('⚠️ Placeholder <!-- __ENV_CONFIG__ --> not found in index.html. Environment not injected.');
  }
}

injectEnv();
