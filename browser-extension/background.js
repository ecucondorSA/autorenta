// Background Service Worker
console.log('[Claude Code Browser Control] Background worker started');

let connected = false;
let ws = null;

// Listen for extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('[Background] Extension clicked on tab:', tab.id);
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message.type);

  if (message.type === 'screenshot') {
    // Capture screenshot
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      sendResponse({ success: true, screenshot: dataUrl });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'status') {
    sendResponse({ connected });
  }
});

// Connect to bridge server (optional - for full functionality)
function connectToBridge() {
  try {
    ws = new WebSocket('ws://localhost:9222');

    ws.onopen = () => {
      console.log('[Background] Connected to bridge server');
      connected = true;
      ws.send(JSON.stringify({ type: 'handshake', data: { clientType: 'extension' } }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('[Background] Bridge message:', message.type);

      // Forward action to content script
      if (message.type === 'execute') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, message);
          }
        });
      }
    };

    ws.onclose = () => {
      console.log('[Background] Disconnected from bridge');
      connected = false;
      setTimeout(connectToBridge, 5000); // Retry
    };

    ws.onerror = (error) => {
      console.error('[Background] Bridge error:', error);
    };
  } catch (error) {
    console.error('[Background] Failed to connect:', error);
  }
}

// Auto-connect on startup
connectToBridge();
