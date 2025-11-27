// Background Service Worker v1.2 - Infinite Reconnect with Exponential Backoff
console.log('[Claude Code Browser Control] Background worker v1.2 started');

let connected = false;
let bridgeSocket = null;
let reconnectAttempts = 0;

// Exponential backoff config
const BASE_RECONNECT_DELAY = 1000;  // Start at 1s
const MAX_RECONNECT_DELAY = 30000;  // Cap at 30s
const WATCHDOG_INTERVAL = 60000;    // Check connection every 60s

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('[Background] Extension clicked on tab:', tab.id);
  updateBadge();
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received from content script:', message.type);

  if (message.type === 'screenshot') {
    // Capture screenshot
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      sendResponse({ success: true, screenshot: dataUrl });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'status') {
    sendResponse({
      connected,
      bridgeConnected: connected,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }

  if (message.type === 'bridge-status') {
    sendResponse({
      bridgeConnected: connected,
      connectionAttempts: reconnectAttempts,
      status: connected ? 'ready' : 'connecting'
    });
    return true;
  }

  if (message.type === 'force-reconnect') {
    forceReconnect();
    sendResponse({ success: true });
    return true;
  }

  // Forward action results from content script back to bridge
  if (message.type === 'action-result' && bridgeSocket) {
    bridgeSocket.send(JSON.stringify({
      type: 'action-result',
      sessionId: message.sessionId,
      action: message.action,
      result: message.result,
      error: message.error
    }));
  }
});

// Update extension badge
function updateBadge() {
  const status = connected ? '✓' : '✕';
  const color = connected ? '#4CAF50' : '#FF6B35';
  chrome.action.setBadgeText({ text: status });
  chrome.action.setBadgeBackgroundColor({ color });
}

// Calculate reconnect delay with exponential backoff
function getReconnectDelay() {
  const delay = Math.min(
    MAX_RECONNECT_DELAY,
    BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts)
  );
  return delay;
}

// Schedule next reconnection attempt
function scheduleReconnect() {
  reconnectAttempts++;
  const delay = getReconnectDelay();

  // Log every 5 attempts to avoid spam
  if (reconnectAttempts % 5 === 1 || reconnectAttempts <= 3) {
    console.log(`[Background] Reconnecting in ${Math.round(delay/1000)}s (attempt ${reconnectAttempts})...`);
  }

  setTimeout(connectToBridge, delay);
}

// Connect to bridge server - INFINITE RETRY
function connectToBridge() {
  // Close existing socket if any
  if (bridgeSocket) {
    try {
      bridgeSocket.close();
    } catch (e) { /* ignore */ }
    bridgeSocket = null;
  }

  try {
    console.log('[Background] Connecting to bridge server...');
    bridgeSocket = new WebSocket('ws://localhost:9223');

    bridgeSocket.onopen = () => {
      console.log('[Background] ✅ Connected to bridge server');
      connected = true;
      reconnectAttempts = 0; // Reset on successful connection
      updateBadge();

      // Send handshake
      bridgeSocket.send(JSON.stringify({
        type: 'handshake',
        data: {
          clientType: 'extension',
          version: '1.0.0',
          capabilities: ['execute', 'screenshot', 'navigate', 'click', 'type', 'scroll']
        }
      }));
    };

    bridgeSocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[Background] Bridge message:', message.type);

        // Handle execute requests
        if (message.type === 'execute') {
          handleExecute(message);
        }

        // Acknowledge handshake
        if (message.type === 'handshake-ack') {
          console.log('[Background] Bridge acknowledged:', message.data?.status);
        }
      } catch (error) {
        console.error('[Background] Error parsing bridge message:', error);
      }
    };

// ========== Action Handler ==========
async function handleExecute(message) {
  const { action, sessionId } = message;
  const actionType = action?.type;

  console.log('[Background] Executing action:', actionType);

  // Actions that can run in background (no content script needed)
  const backgroundActions = ['navigate', 'screenshot', 'getUrl'];

  if (backgroundActions.includes(actionType)) {
    try {
      let result;

      if (actionType === 'navigate') {
        // Navigate using chrome.tabs API
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          await chrome.tabs.update(tabs[0].id, { url: action.value });
          result = { navigating: true, url: action.value };
        } else {
          // Create new tab if no active tab
          await chrome.tabs.create({ url: action.value });
          result = { navigating: true, url: action.value, newTab: true };
        }
      }

      else if (actionType === 'screenshot') {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        result = { success: true, screenshot: dataUrl };
      }

      else if (actionType === 'getUrl') {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          result = {
            url: tabs[0].url,
            title: tabs[0].title,
            tabId: tabs[0].id
          };
        } else {
          result = { error: 'No active tab' };
        }
      }

      // Send result back to bridge
      sendResult(sessionId, result);

    } catch (error) {
      console.error('[Background] Action error:', error);
      sendResult(sessionId, { error: error.message });
    }
    return;
  }

  // Actions that need content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      // Check if we can inject into this tab
      const url = tabs[0].url || '';
      if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
        sendResult(sessionId, {
          error: 'Cannot run on this page. Navigate to a regular webpage first.',
          hint: 'Use browser_navigate to go to a normal URL'
        });
        return;
      }

      console.log('[Background] Forwarding to content script:', actionType);
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Content script error:', chrome.runtime.lastError);
          sendResult(sessionId, { error: chrome.runtime.lastError.message });
        }
        // Response comes back via content script → background → bridge
      });
    } else {
      sendResult(sessionId, { error: 'No active tab found' });
    }
  });
}

function sendResult(sessionId, result) {
  if (bridgeSocket && bridgeSocket.readyState === 1) {
    bridgeSocket.send(JSON.stringify({
      type: 'action-result',
      sessionId,
      result
    }));
  }
}

    bridgeSocket.onclose = () => {
      console.log('[Background] ❌ Disconnected from bridge');
      connected = false;
      updateBadge();
      scheduleReconnect(); // Infinite retry with backoff
    };

    bridgeSocket.onerror = (error) => {
      // Only log non-connection-refused errors
      if (error.message && !error.message.includes('ECONNREFUSED')) {
        console.error('[Background] Bridge connection error:', error);
      }
    };
  } catch (error) {
    console.error('[Background] Failed to create WebSocket:', error);
    scheduleReconnect(); // Infinite retry with backoff
  }
}

// Auto-connect on startup (with delay to ensure background worker is ready)
setTimeout(() => {
  console.log('[Background] Initializing bridge connection...');
  connectToBridge();
}, 1000);

// ========== Watchdog - Periodic Connection Check ==========
// This ensures we reconnect even if the backoff gets stuck
setInterval(() => {
  if (!connected) {
    console.log('[Watchdog] Connection lost, forcing reconnect...');
    reconnectAttempts = 0; // Reset backoff
    connectToBridge();
  } else if (bridgeSocket && bridgeSocket.readyState !== 1) {
    // WebSocket.OPEN = 1
    console.log('[Watchdog] Socket not open, reconnecting...');
    connected = false;
    updateBadge();
    reconnectAttempts = 0;
    connectToBridge();
  }
}, WATCHDOG_INTERVAL);

// Force reconnect API - can be called from popup or externally
function forceReconnect() {
  console.log('[Background] Force reconnect requested');
  reconnectAttempts = 0;
  connected = false;
  connectToBridge();
}

// Expose for popup
self.forceReconnect = forceReconnect;
