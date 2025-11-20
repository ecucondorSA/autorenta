document.addEventListener('DOMContentLoaded', () => {
  // Check bridge connection
  chrome.runtime.sendMessage({ type: 'status' }, (response) => {
    const statusEl = document.getElementById('bridge-status');
    if (response && response.connected) {
      statusEl.innerHTML = '<span class="indicator active"></span><strong>Connected</strong>';
    }
  });

  // Attach event listeners
  document.getElementById('test-btn').addEventListener('click', testExtension);
  document.getElementById('docs-btn').addEventListener('click', openDocs);
});

function testExtension() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'execute',
        action: {
          type: 'scroll',
          options: { direction: 'down', amount: 300 }
        }
      }, (response) => {
        if (response && response.success) {
          // Using console.log instead of alert for better UX in extensions,
          // or we could update a status element. Sticking to simple feedback.
          console.log('✅ Test successful! Page scrolled.');
          const infoEl = document.querySelector('.info');
          infoEl.innerHTML = '✅ Test successful! Page scrolled.<br>' + infoEl.innerHTML;
        } else {
          console.error('❌ Test failed.');
          const infoEl = document.querySelector('.info');
          infoEl.innerHTML = '❌ Test failed. Check console.<br>' + infoEl.innerHTML;
        }
      });
    }
  });
}

function openDocs() {
  window.open('https://github.com/ecucondorSA/autorenta/tree/main/browser-extension', '_blank');
}
