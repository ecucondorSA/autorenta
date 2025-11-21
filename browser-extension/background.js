// Background Service Worker
console.log('[Claude Code Browser Control] Background worker started');

let connected = false;
let bridgeSocket = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 3000;

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
      connectionAttempts,
      status: connected ? 'ready' : 'connecting'
    });
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

// Connect to bridge server
function connectToBridge() {
  if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[Background] Max reconnection attempts reached. Working in standalone mode.');
    return;
  }

  try {
    console.log('[Background] Connecting to bridge server (attempt ' + (connectionAttempts + 1) + ')...');
    bridgeSocket = new WebSocket('ws://localhost:9223');

    bridgeSocket.onopen = () => {
      console.log('[Background] ✅ Connected to bridge server');
      connected = true;
      connectionAttempts = 0;
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

        // Forward execution request to content script
        if (message.type === 'execute') {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
              console.log('[Background] Forwarding action to content script:', message.action?.type);
              chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                if (chrome.runtime.lastError) {
                  console.error('[Background] Content script error:', chrome.runtime.lastError);
                  // Send error back to bridge
                  if (bridgeSocket && bridgeSocket.readyState === 1) {
                    bridgeSocket.send(JSON.stringify({
                      type: 'action-result',
                      sessionId: message.sessionId,
                      error: chrome.runtime.lastError.message
                    }));
                  }
                }
              });
            } else {
              console.warn('[Background] No active tab found');
              if (bridgeSocket && bridgeSocket.readyState === 1) {
                bridgeSocket.send(JSON.stringify({
                  type: 'action-result',
                  sessionId: message.sessionId,
                  error: 'No active tab found'
                }));
              }
            }
          });
        }

        // Acknowledge handshake
        if (message.type === 'handshake-ack') {
          console.log('[Background] Bridge acknowledged:', message.data?.status);
        }
      } catch (error) {
        console.error('[Background] Error parsing bridge message:', error);
      }
    };

    bridgeSocket.onclose = () => {
      console.log('[Background] ❌ Disconnected from bridge');
      connected = false;
      updateBadge();
      connectionAttempts++;

      // Retry connection
      setTimeout(connectToBridge, RECONNECT_DELAY);
    };

    bridgeSocket.onerror = (error) => {
      console.error('[Background] Bridge connection error:', error);
    };
  } catch (error) {
    console.error('[Background] Failed to create WebSocket:', error);
    connectionAttempts++;
    setTimeout(connectToBridge, RECONNECT_DELAY);
  }
}

// Auto-connect on startup (with delay to ensure background worker is ready)
setTimeout(() => {
  console.log('[Background] Initializing bridge connection...');
  connectToBridge();
}, 1000);
