# Claude Code Browser Extension

Control your real Chrome browser from Claude Code via MCP. Unlike Playwright, this uses your actual browser with all your sessions, cookies, and extensions.

## Quick Start

```bash
# 1. Start the bridge server
cd browser-extension && npm start

# 2. Load extension in Chrome
#    chrome://extensions → Developer mode → Load unpacked → select this folder

# 3. Use Claude Code (no restart needed with v1.2!)
#    The extension will auto-connect when bridge becomes available

# 4. Test the connection
# In Claude Code, use: browser_status
```

## What's New in v1.2

| Feature | Description |
|---------|-------------|
| **Infinite Reconnect** | Both bridge and extension retry forever |
| **Exponential Backoff** | Smart delays: 1s → 1.5s → 2.25s → ... → 30s max |
| **Watchdog** | Auto-recovery every 60s if connection is lost |
| **Order Independent** | Start bridge/extension in any order |
| **Force Reconnect** | Click "Reconnect" in popup or use `browser_status reconnect:true` |

### Problem Solved

Previously, if the bridge wasn't running when Claude Code started, the MCP would try 5 times and give up. Now:

- **MCP Server**: Reconnects infinitely with exponential backoff
- **Chrome Extension**: Reconnects infinitely with exponential backoff
- **Watchdog**: Forces reconnection every 60s if disconnected
- **Lazy Connection**: Reconnects automatically on each tool call

## Features

| Feature | Description |
|---------|-------------|
| **Real Browser** | Uses your actual Chrome with sessions/cookies |
| **Shadow DOM** | Selectors penetrate Shadow DOM boundaries |
| **Smart Wait** | Intelligent polling for elements to appear |
| **Auto-Reconnect** | Exponential backoff, infinite retry |
| **Lazy Connect** | Reconnects automatically on each tool call |
| **Visual Feedback** | Orange overlay shows current action |

## MCP Tools

| Tool | Description |
|------|-------------|
| `browser_status` | Check connection, force reconnect with `reconnect:true` |
| `browser_navigate` | Navigate to URL |
| `browser_click` | Click element by CSS selector |
| `browser_type` | Type text into input (clears first by default) |
| `browser_scroll` | Scroll up/down by pixels |
| `browser_screenshot` | Capture visible viewport (base64) |
| `browser_get_text` | Get text content of element |
| `browser_get_url` | Get current page URL and title |
| `browser_wait_for` | Wait for element to appear (polling) |
| `browser_wait_network` | Wait for network to be idle |
| `browser_wait` | Simple delay in milliseconds |

## Usage Examples

```
# Navigate and interact
browser_navigate url:"https://google.com"
browser_wait_for selector:"textarea[name=q]"
browser_type selector:"textarea[name=q]" text:"AutoRenta Argentina"
browser_click selector:"input[type=submit]"

# Wait and capture
browser_wait_network
browser_screenshot

# Check status / force reconnect
browser_status
browser_status reconnect:true
```

## Architecture

```
┌─────────────────┐     stdio      ┌─────────────────┐
│   Claude Code   │◄──────────────►│   MCP Server    │
└─────────────────┘                └────────┬────────┘
                                            │ WebSocket
                                            │ (auto-reconnect)
                                            ▼
                                   ┌─────────────────┐
                                   │  Bridge Server  │ :9223
                                   └────────┬────────┘
                                            │ WebSocket
                                            │ (auto-reconnect)
                                            ▼
                                   ┌─────────────────┐
                                   │ Chrome Extension│
                                   │   + Watchdog    │
                                   └────────┬────────┘
                                            │ DOM APIs
                                            ▼
                                   ┌─────────────────┐
                                   │  Your Browser   │
                                   └─────────────────┘
```

## Scripts

```bash
npm start        # Start bridge (automated, shows instructions)
npm stop         # Stop bridge server
npm run bridge   # Start bridge (manual, foreground)
npm run status   # Check bridge status (JSON)
npm run health   # Health check endpoint
```

## Troubleshooting

### "Bridge not connected"

```bash
# 1. Check if bridge is running
npm run health

# 2. Start bridge
npm start

# 3. Force reconnect in Claude Code
browser_status reconnect:true

# 4. Check logs
cat /tmp/bridge-server.log
```

### Extension not working

1. Go to `chrome://extensions`
2. Find "Claude Code Browser Control"
3. Check the badge:
   - ✓ (green) = Connected
   - ✕ (orange) = Not connected
4. Click "Reload" to force reconnection
5. Click extension icon → "Reconnect" button
6. Check "Inspect views: service worker" for errors

### Element not found

- Verify selector in Chrome DevTools: `document.querySelector('your-selector')`
- For Shadow DOM elements, the extension searches recursively
- Use `browser_wait_for` before interacting with dynamic elements

### Actions timing out

- Chrome must be visible (not minimized)
- Increase timeout: `browser_wait_for selector:"..." timeout:20000`
- Check if element is in iframe (not supported yet)

### Connection keeps dropping

With v1.2, this should auto-recover. If not:

1. Check bridge logs: `cat /tmp/bridge-server.log`
2. Reload extension in Chrome
3. Use `browser_status reconnect:true`

## Files

```
browser-extension/
├── mcp-server.js      # MCP Server (Claude Code interface) - v1.1
├── bridge-server.js   # WebSocket bridge
├── background.js      # Chrome extension service worker - v1.2
├── content.js         # Page automation scripts - v1.1
├── popup.html         # Extension popup UI - v1.2
├── popup.js           # Popup logic with reconnect - v1.2
├── manifest.json      # Chrome extension manifest
├── start.sh           # Automated start script - v1.2
├── stop.sh            # Stop script
└── README.md          # This file
```

## vs Playwright MCP

| Aspect | Browser Extension | Playwright MCP |
|--------|-------------------|----------------|
| Sessions | Your real sessions | Fresh browser |
| Cookies | Preserved | None |
| Extensions | Work normally | Not available |
| Detection | Not detected as bot | May be detected |
| Speed | Slightly slower | Faster |
| Reliability | Depends on extension | Very reliable |
| Headless | No | Yes |

**Use Browser Extension when:**
- You need authenticated sessions
- Testing with browser extensions
- Sites block automation tools
- You want visual debugging

**Use Playwright when:**
- Running automated tests
- Need headless execution
- Require maximum reliability
- Parallel browser instances

## Version History

- **v1.2.0** - Infinite reconnect, watchdog, improved popup, order-independent startup
- **v1.1.0** - Shadow DOM, intelligent wait, auto-reconnect, lazy connection
- **v1.0.0** - Initial release

---

**Status**: Production Ready
**Requires**: Node.js 18+, Chrome/Chromium
