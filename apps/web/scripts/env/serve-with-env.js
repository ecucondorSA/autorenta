const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env.local
const envPath = path.resolve(__dirname, '../../../.env.local');
console.log(`[serve-with-env] Loading environment from: ${envPath}`);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('[serve-with-env] Warning: Could not load .env.local file');
} else {
  console.log(`[serve-with-env] Loaded ${Object.keys(result.parsed || {}).length} variables`);
}

// Construct the command
// We use 'pnpm exec ng serve' by default, but allow overriding args
const args = process.argv.slice(2);
const command = 'pnpm';
const commandArgs = ['exec', 'ng', 'serve', ...args];

console.log(`[serve-with-env] Executing: ${command} ${commandArgs.join(' ')}`);

const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    ...result.parsed, // Inject loaded variables
  },
});

child.on('exit', (code) => {
  process.exit(code);
});
