// Content Script - Runs on every page
console.log('[Claude Code Browser Control] Content script loaded');

let overlay = null;

// Create overlay on page load
function createOverlay() {
  const container = document.createElement('div');
  container.id = 'claude-overlay';
  container.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; z-index: 999999; display: none; font-family: sans-serif;">
      <div style="background: rgba(0, 0, 0, 0.9); color: white; padding: 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); min-width: 300px;">
        <div style="font-size: 14px; font-weight: 600; color: #FF6B00; margin-bottom: 8px;">
          Claude Code Browser Control
        </div>
        <div id="claude-status" style="font-size: 12px; margin-bottom: 8px;">Ready</div>
        <div style="height: 3px; background: #333; border-radius: 2px; overflow: hidden;">
          <div id="claude-progress" style="height: 100%; background: #FF6B00; width: 0%; transition: width 0.3s;"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(container);
  return container;
}

// Initialize overlay
if (document.body) {
  overlay = createOverlay();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    overlay = createOverlay();
  });
}

// Show overlay
function showOverlay(message) {
  if (!overlay) return;
  const panel = overlay.querySelector('#claude-overlay > div');
  const status = document.getElementById('claude-status');
  const progress = document.getElementById('claude-progress');

  panel.style.display = 'block';
  status.textContent = message;
  progress.style.width = '0%';

  setTimeout(() => {
    progress.style.width = '100%';
  }, 100);
}

// Hide overlay
function hideOverlay() {
  if (!overlay) return;
  const panel = overlay.querySelector('#claude-overlay > div');
  setTimeout(() => {
    panel.style.display = 'none';
  }, 2000);
}

// Execute actions
async function executeAction(action) {
  console.log('[Content] Executing:', action.type);
  showOverlay(`Executing: ${action.type}`);

  try {
    let result;

    switch (action.type) {
      case 'click':
        result = await clickElement(action.selector);
        break;
      case 'type':
        result = await typeInElement(action.selector, action.value);
        break;
      case 'scroll':
        result = await scrollPage(action.options);
        break;
      case 'navigate':
        window.location.href = action.value;
        result = { navigated: true };
        break;
      case 'screenshot':
        const response = await chrome.runtime.sendMessage({ type: 'screenshot' });
        result = response;
        break;
      default:
        throw new Error(`Unknown action: ${action.type}`);
    }

    hideOverlay();
    return { success: true, result };

  } catch (error) {
    console.error('[Content] Action failed:', error);
    hideOverlay();
    return { success: false, error: error.message };
  }
}

// Action implementations
async function clickElement(selector) {
  const element = await waitForElement(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);

  // Highlight element
  highlightElement(element);

  // Click
  await sleep(300);
  element.click();

  return { clicked: true, selector };
}

async function typeInElement(selector, value) {
  const element = await waitForElement(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);

  highlightElement(element);

  element.focus();
  await sleep(100);

  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));

  return { typed: true, value };
}

async function scrollPage(options = {}) {
  const amount = options.amount || 500;
  const direction = options.direction || 'down';

  window.scrollBy({
    top: direction === 'down' ? amount : -amount,
    behavior: 'smooth'
  });

  await sleep(500);
  return { scrolled: amount, direction };
}

// Helper functions
async function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) return element;
    await sleep(100);
  }

  return null;
}

function highlightElement(element) {
  const rect = element.getBoundingClientRect();
  const highlight = document.createElement('div');

  highlight.style.cssText = `
    position: fixed;
    top: ${rect.top}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    border: 3px solid #FF6B00;
    background: rgba(255, 107, 0, 0.1);
    pointer-events: none;
    z-index: 999998;
    box-shadow: 0 0 10px rgba(255, 107, 0, 0.5);
  `;

  document.body.appendChild(highlight);

  setTimeout(() => {
    highlight.remove();
  }, 1000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'execute') {
    executeAction(message.action).then(sendResponse);
    return true; // Keep channel open
  }
});

// Notify ready
console.log('[Content] Ready to receive commands');

// Demo: Auto-test on localhost:4200
if (window.location.hostname === 'localhost' && window.location.port === '4200') {
  console.log('[Content] Running on AutoRenta dev server');

  // Add test button to page
  setTimeout(() => {
    const testBtn = document.createElement('button');
    testBtn.textContent = '🤖 Test Browser Control';
    testBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      padding: 12px 20px;
      background: #FF6B00;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    testBtn.onclick = async () => {
      showOverlay('Running test...');
      await sleep(1000);

      // Example: scroll down
      await scrollPage({ direction: 'down', amount: 300 });
      await sleep(1000);

      // Example: take screenshot
      const { screenshot } = await chrome.runtime.sendMessage({ type: 'screenshot' });
      console.log('[Content] Screenshot captured:', screenshot ? 'success' : 'failed');

      hideOverlay();
      alert('✅ Test complete! Check console for details.');
    };

    document.body.appendChild(testBtn);
  }, 2000);
}
