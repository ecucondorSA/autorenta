// Popup script v1.2

document.addEventListener('DOMContentLoaded', () => {
  // Check status immediately
  checkStatus();

  // Refresh status every 2 seconds while popup is open
  setInterval(checkStatus, 2000);

  // Attach event listeners
  document.getElementById('reconnect-btn').addEventListener('click', forceReconnect);
  document.getElementById('test-btn').addEventListener('click', testExtension);
  document.getElementById('docs-btn').addEventListener('click', openDocs);
});

function checkStatus() {
  chrome.runtime.sendMessage({ type: 'bridge-status' }, (response) => {
    const statusEl = document.getElementById('bridge-status');
    const attemptsEl = document.getElementById('attempts-info');

    if (chrome.runtime.lastError) {
      statusEl.innerHTML = '<span class="indicator inactive"></span>Extension Error';
      return;
    }

    if (response && response.bridgeConnected) {
      statusEl.innerHTML = '<span class="indicator active"></span><strong>Connected</strong>';
      attemptsEl.style.display = 'none';
    } else if (response && response.status === 'connecting') {
      statusEl.innerHTML = '<span class="indicator connecting"></span>Connecting...';
      if (response.connectionAttempts > 0) {
        attemptsEl.textContent = `Retry attempt ${response.connectionAttempts}`;
        attemptsEl.style.display = 'block';
      }
    } else {
      statusEl.innerHTML = '<span class="indicator inactive"></span>Not Connected';
      if (response && response.connectionAttempts > 0) {
        attemptsEl.textContent = `Retry attempt ${response.connectionAttempts}`;
        attemptsEl.style.display = 'block';
      }
    }
  });
}

function showMessage(text, type = 'success') {
  const msgEl = document.getElementById('message');
  msgEl.textContent = text;
  msgEl.className = `message ${type}`;
  msgEl.style.display = 'block';

  setTimeout(() => {
    msgEl.style.display = 'none';
  }, 3000);
}

function forceReconnect() {
  const btn = document.getElementById('reconnect-btn');
  btn.disabled = true;
  btn.textContent = 'Reconnecting...';

  // Call the forceReconnect function in background
  chrome.runtime.sendMessage({ type: 'force-reconnect' }, (response) => {
    btn.disabled = false;
    btn.textContent = 'Reconnect';

    // Wait a moment then check status
    setTimeout(() => {
      checkStatus();
      chrome.runtime.sendMessage({ type: 'bridge-status' }, (status) => {
        if (status && status.bridgeConnected) {
          showMessage('Connected to bridge!', 'success');
        } else {
          showMessage('Bridge not available. Is it running?', 'error');
        }
      });
    }, 1000);
  });
}

function testExtension() {
  const btn = document.getElementById('test-btn');
  btn.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) {
      showMessage('No active tab found', 'error');
      btn.disabled = false;
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {
      type: 'execute',
      action: {
        type: 'scroll',
        options: { direction: 'down', amount: 200 }
      }
    }, (response) => {
      btn.disabled = false;

      if (chrome.runtime.lastError) {
        showMessage('Content script not loaded. Refresh the page.', 'error');
        return;
      }

      if (response && response.success) {
        showMessage('Test passed! Page scrolled.', 'success');
        // Scroll back
        setTimeout(() => {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'execute',
            action: {
              type: 'scroll',
              options: { direction: 'up', amount: 200 }
            }
          });
        }, 500);
      } else {
        showMessage('Test failed: ' + (response?.error || 'Unknown error'), 'error');
      }
    });
  });
}

function openDocs() {
  chrome.tabs.create({
    url: 'https://github.com/ecucondorSA/autorenta/tree/main/browser-extension'
  });
}
