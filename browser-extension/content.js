// Content Script - Runs on every page
// v1.1 - Shadow DOM support, intelligent wait, improved actions

console.log('[Claude Code Browser Control] Content script v1.1 loaded');

let overlay = null;

// ========== Overlay UI ==========

function createOverlay() {
  const container = document.createElement('div');
  container.id = 'claude-overlay';
  container.innerHTML = `
    <div style="position: fixed; top: 20px; right: 20px; z-index: 999999; display: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
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

if (document.body) {
  overlay = createOverlay();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    overlay = createOverlay();
  });
}

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

function hideOverlay() {
  if (!overlay) return;
  const panel = overlay.querySelector('#claude-overlay > div');
  setTimeout(() => {
    panel.style.display = 'none';
  }, 1500);
}

// ========== Shadow DOM Support ==========

/**
 * Recursively search for an element, penetrating Shadow DOM boundaries
 * @param {string} selector - CSS selector
 * @param {Element|Document} root - Starting point for search
 * @returns {Element|null}
 */
function deepQuerySelector(selector, root = document) {
  // First try direct search
  let element = root.querySelector(selector);
  if (element) return element;

  // Search in shadow roots
  const allElements = root.querySelectorAll('*');
  for (const el of allElements) {
    if (el.shadowRoot) {
      element = deepQuerySelector(selector, el.shadowRoot);
      if (element) return element;
    }
  }

  return null;
}

/**
 * Find all matching elements including those in Shadow DOM
 * @param {string} selector - CSS selector
 * @param {Element|Document} root - Starting point
 * @returns {Element[]}
 */
function deepQuerySelectorAll(selector, root = document) {
  const results = Array.from(root.querySelectorAll(selector));

  const allElements = root.querySelectorAll('*');
  for (const el of allElements) {
    if (el.shadowRoot) {
      results.push(...deepQuerySelectorAll(selector, el.shadowRoot));
    }
  }

  return results;
}

// ========== Intelligent Wait ==========

/**
 * Wait for an element to appear with intelligent polling
 * @param {string} selector - CSS selector
 * @param {object} options - Wait options
 * @returns {Promise<Element>}
 */
async function waitForElement(selector, options = {}) {
  const {
    timeout = 10000,
    pollInterval = 100,
    visible = true,
    shadowDom = true
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = shadowDom
      ? deepQuerySelector(selector)
      : document.querySelector(selector);

    if (element) {
      if (!visible) return element;

      // Check if element is visible
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);

      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        style.opacity !== '0';

      if (isVisible) return element;
    }

    await sleep(pollInterval);
  }

  throw new Error(`Element not found after ${timeout}ms: ${selector}`);
}

/**
 * Wait for element to disappear
 */
async function waitForElementToDisappear(selector, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const element = deepQuerySelector(selector);
    if (!element) return true;
    await sleep(100);
  }

  return false;
}

/**
 * Wait for network idle (no pending requests for specified time)
 */
async function waitForNetworkIdle(idleTime = 500, timeout = 10000) {
  return new Promise((resolve) => {
    let lastActivity = Date.now();
    let resolved = false;

    const observer = new PerformanceObserver((list) => {
      lastActivity = Date.now();
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      // PerformanceObserver not supported, just wait
      setTimeout(resolve, idleTime);
      return;
    }

    const checkIdle = setInterval(() => {
      if (resolved) return;

      if (Date.now() - lastActivity >= idleTime) {
        resolved = true;
        clearInterval(checkIdle);
        observer.disconnect();
        resolve();
      }

      if (Date.now() - lastActivity > timeout) {
        resolved = true;
        clearInterval(checkIdle);
        observer.disconnect();
        resolve();
      }
    }, 100);
  });
}

// ========== Helper Functions ==========

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
    transition: all 0.2s ease;
  `;

  document.body.appendChild(highlight);

  setTimeout(() => {
    highlight.style.opacity = '0';
    setTimeout(() => highlight.remove(), 200);
  }, 800);
}

function scrollIntoViewIfNeeded(element) {
  const rect = element.getBoundingClientRect();
  const isInViewport =
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth;

  if (!isInViewport) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return sleep(300); // Wait for scroll animation
  }
  return Promise.resolve();
}

// ========== Action Implementations ==========

async function clickElement(selector) {
  const element = await waitForElement(selector);

  await scrollIntoViewIfNeeded(element);
  highlightElement(element);
  await sleep(200);

  // Try multiple click methods for better compatibility
  try {
    element.click();
  } catch (e) {
    // Fallback: dispatch mouse events
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
  }

  return { clicked: true, selector, tagName: element.tagName.toLowerCase() };
}

async function typeInElement(selector, value, clear = true) {
  const element = await waitForElement(selector);

  await scrollIntoViewIfNeeded(element);
  highlightElement(element);

  element.focus();
  await sleep(50);

  if (clear) {
    // Clear existing value
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Type character by character for better compatibility with frameworks
  for (const char of value) {
    element.value += char;
    element.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    await sleep(10); // Small delay between characters
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));

  return { typed: true, value, selector };
}

async function scrollPage(options = {}) {
  const { amount = 500, direction = 'down' } = options;
  const scrollAmount = direction === 'down' ? amount : -amount;

  window.scrollBy({
    top: scrollAmount,
    behavior: 'smooth'
  });

  await sleep(300); // Wait for scroll animation

  return {
    scrolled: amount,
    direction,
    currentY: window.scrollY,
    maxY: document.documentElement.scrollHeight - window.innerHeight
  };
}

async function getElementText(selector) {
  const element = await waitForElement(selector);
  highlightElement(element);

  return {
    text: element.textContent?.trim() || '',
    innerText: element.innerText?.trim() || '',
    selector,
    tagName: element.tagName.toLowerCase()
  };
}

async function getCurrentUrl() {
  return {
    url: window.location.href,
    origin: window.location.origin,
    pathname: window.location.pathname,
    title: document.title
  };
}

async function waitForSelector(selector, timeout = 10000) {
  try {
    const element = await waitForElement(selector, { timeout });
    return {
      found: true,
      selector,
      tagName: element.tagName.toLowerCase()
    };
  } catch (error) {
    return {
      found: false,
      selector,
      error: error.message
    };
  }
}

// ========== Main Action Executor ==========

async function executeAction(action) {
  console.log('[Content] Executing:', action.type, action);
  showOverlay(`Executing: ${action.type}`);

  try {
    let result;

    switch (action.type) {
      case 'click':
        result = await clickElement(action.selector);
        break;

      case 'type':
        result = await typeInElement(action.selector, action.value, action.clear !== false);
        break;

      case 'scroll':
        result = await scrollPage(action.options);
        break;

      case 'navigate':
        window.location.href = action.value;
        result = { navigating: true, url: action.value };
        break;

      case 'screenshot':
        const response = await chrome.runtime.sendMessage({ type: 'screenshot' });
        result = response;
        break;

      case 'getText':
        result = await getElementText(action.selector);
        break;

      case 'getUrl':
        result = await getCurrentUrl();
        break;

      case 'waitFor':
        result = await waitForSelector(action.selector, action.timeout || 10000);
        break;

      case 'waitForNetworkIdle':
        await waitForNetworkIdle(action.idleTime || 500, action.timeout || 10000);
        result = { networkIdle: true };
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

// ========== Message Listener ==========

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'execute') {
    executeAction(message.action)
      .then(result => {
        // Include sessionId in response for bridge routing
        sendResponse({ ...result, sessionId: message.sessionId });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message, sessionId: message.sessionId });
      });
    return true; // Keep channel open for async response
  }

  if (message.type === 'ping') {
    sendResponse({ pong: true, url: window.location.href });
    return true;
  }
});

// ========== Notify Ready ==========

console.log('[Content] Ready - Features: Shadow DOM, intelligent wait, scroll-into-view');

// ========== Dev Server Test Button ==========

if (window.location.hostname === 'localhost' && window.location.port === '4200') {
  console.log('[Content] Running on AutoRenta dev server');

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
      transition: transform 0.2s;
    `;

    testBtn.onmouseenter = () => testBtn.style.transform = 'scale(1.05)';
    testBtn.onmouseleave = () => testBtn.style.transform = 'scale(1)';

    testBtn.onclick = async () => {
      showOverlay('Running test suite...');

      try {
        // Test 1: Scroll
        await scrollPage({ direction: 'down', amount: 300 });
        await sleep(500);

        // Test 2: Get URL
        const urlInfo = await getCurrentUrl();
        console.log('[Test] Current URL:', urlInfo);

        // Test 3: Screenshot
        const { screenshot } = await chrome.runtime.sendMessage({ type: 'screenshot' });
        console.log('[Test] Screenshot:', screenshot ? 'captured' : 'failed');

        // Test 4: Scroll back
        await scrollPage({ direction: 'up', amount: 300 });

        hideOverlay();
        alert('✅ Test complete!\n\nCheck console for details.');

      } catch (error) {
        hideOverlay();
        alert('❌ Test failed: ' + error.message);
      }
    };

    document.body.appendChild(testBtn);
  }, 2000);
}
