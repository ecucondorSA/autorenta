#!/usr/bin/env node
/**
 * AutoRenta JavaScript Console Debugger
 *
 * Captures console.log output from the Android app via Chrome DevTools Protocol
 *
 * Usage:
 *   node tools/debug-js-console.js
 *
 * Requirements:
 *   - ADB port forwarding: adb forward tcp:9222 localabstract:chrome_devtools_remote
 *   - App running on device
 */

const WebSocket = require('ws');
const http = require('http');

// Colors for terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Get log level color
function getLevelColor(level) {
  switch (level) {
    case 'error': return colors.red;
    case 'warning': return colors.yellow;
    case 'info': return colors.blue;
    case 'debug': return colors.purple;
    default: return colors.reset;
  }
}

// Format timestamp
function formatTime() {
  return new Date().toISOString().substring(11, 23);
}

// Print banner
function printBanner() {
  console.log(colors.green);
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         AutoRenta JS Console Debugger v1.0                ║');
  console.log('║   Real-time JavaScript console capture via DevTools       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
}

// Get available targets from Chrome DevTools
async function getTargets() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Connect to a target and listen for console messages
async function connectToTarget(target) {
  console.log(colors.cyan + `Connecting to: ${target.title}` + colors.reset);
  console.log(colors.cyan + `URL: ${target.url}` + colors.reset);
  console.log(colors.cyan + '═══════════════════════════════════════════════════════════' + colors.reset);
  console.log('');

  const ws = new WebSocket(target.webSocketDebuggerUrl);

  ws.on('open', () => {
    // Enable Runtime domain to receive console messages
    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    // Enable Log domain
    ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
    // Enable Console domain (deprecated but still works)
    ws.send(JSON.stringify({ id: 3, method: 'Console.enable' }));

    console.log(colors.green + '✓ Connected! Listening for console messages...' + colors.reset);
    console.log('');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      // Handle console API calls
      if (msg.method === 'Runtime.consoleAPICalled') {
        const { type, args, timestamp } = msg.params;
        const time = formatTime();
        const color = getLevelColor(type);

        // Format arguments
        const formattedArgs = args.map(arg => {
          if (arg.type === 'string') return arg.value;
          if (arg.type === 'number') return arg.value;
          if (arg.type === 'boolean') return arg.value;
          if (arg.type === 'object' && arg.preview) {
            return JSON.stringify(
              arg.preview.properties.reduce((obj, p) => {
                obj[p.name] = p.value;
                return obj;
              }, {}),
              null,
              2
            );
          }
          if (arg.type === 'undefined') return 'undefined';
          return arg.description || arg.value || '[object]';
        }).join(' ');

        // Check if it's an AutoRenta log
        const isARLog = formattedArgs.includes('[AR]');

        // Print formatted log
        const levelBadge = `[${type.toUpperCase()}]`.padEnd(10);
        console.log(
          `${colors.cyan}${time}${colors.reset} ${color}${levelBadge}${colors.reset} ${formattedArgs}`
        );
      }

      // Handle log entries
      if (msg.method === 'Log.entryAdded') {
        const { entry } = msg.params;
        const time = formatTime();
        const color = getLevelColor(entry.level);

        console.log(
          `${colors.cyan}${time}${colors.reset} ${color}[${entry.level.toUpperCase()}]${colors.reset} ${entry.text}`
        );
      }

      // Handle exceptions
      if (msg.method === 'Runtime.exceptionThrown') {
        const { exceptionDetails } = msg.params;
        const time = formatTime();

        console.log(
          `${colors.red}${colors.bold}${time} [EXCEPTION] ${exceptionDetails.text}${colors.reset}`
        );
        if (exceptionDetails.exception?.description) {
          console.log(colors.red + exceptionDetails.exception.description + colors.reset);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  });

  ws.on('error', (err) => {
    console.error(colors.red + 'WebSocket error:', err.message + colors.reset);
  });

  ws.on('close', () => {
    console.log(colors.yellow + '\nConnection closed. Reconnecting in 3 seconds...' + colors.reset);
    setTimeout(() => main(), 3000);
  });
}

// Main function
async function main() {
  printBanner();

  try {
    const targets = await getTargets();

    // Find AutoRenta target
    const autorentaTarget = targets.find(t =>
      t.url.includes('autorentar') ||
      t.url.includes('localhost:4200') ||
      t.title.includes('AutoRent')
    );

    if (autorentaTarget) {
      await connectToTarget(autorentaTarget);
    } else if (targets.length > 0) {
      // Connect to first available target
      console.log(colors.yellow + 'AutoRenta target not found. Available targets:' + colors.reset);
      targets.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.title} - ${t.url}`);
      });
      console.log('');
      console.log('Connecting to first target...');
      await connectToTarget(targets[0]);
    } else {
      console.log(colors.red + 'No targets available. Make sure:' + colors.reset);
      console.log('  1. The app is running on the device');
      console.log('  2. ADB port forwarding is set up:');
      console.log('     adb forward tcp:9222 localabstract:chrome_devtools_remote');
      process.exit(1);
    }
  } catch (error) {
    console.error(colors.red + 'Error connecting to DevTools:' + colors.reset, error.message);
    console.log('');
    console.log('Make sure ADB port forwarding is set up:');
    console.log('  adb forward tcp:9222 localabstract:chrome_devtools_remote');
    console.log('');
    console.log('Retrying in 5 seconds...');
    setTimeout(() => main(), 5000);
  }
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(colors.yellow + '\n\nDebugger stopped.' + colors.reset);
  process.exit(0);
});

main();
