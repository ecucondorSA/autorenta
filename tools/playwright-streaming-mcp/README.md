# Playwright Streaming MCP Server

Real-time browser automation with live event streaming via Chrome DevTools Protocol (CDP).

## Features

- **Live DOM Tracking**: Real-time mutations (inserts, removes, attribute changes)
- **Network Monitoring**: All requests/responses as they happen
- **Console Capture**: Browser console messages in real-time
- **Navigation Events**: Page loads, redirects, frame changes
- **Dialog Detection**: Alerts, confirms, prompts
- **Headed Mode**: Visible browser window by default

## Installation

```bash
cd /home/edu/autorenta/tools/playwright-streaming-mcp
npm install
npx playwright install chromium
```

## Register with Claude Code

```bash
claude mcp add playwright-streaming node /home/edu/autorenta/tools/playwright-streaming-mcp/server.js
```

## Available Tools

| Tool | Description |
|------|-------------|
| `stream_navigate` | Navigate to URL with real-time events |
| `stream_click` | Click element with feedback |
| `stream_type` | Type text with feedback |
| `stream_get_events` | Get all events since last check |
| `stream_snapshot` | Page state + recent events |
| `stream_screenshot` | Take screenshot (base64) |
| `stream_evaluate` | Execute JavaScript |
| `stream_wait_for` | Wait for selector |
| `stream_close` | Close browser |
| `stream_status` | Get streaming status |

## Event Types

- `dom_change` - DOM mutations (document_updated, node_inserted, node_removed, attribute_modified)
- `network_request` - Outgoing HTTP requests
- `network_response` - HTTP responses
- `console` - Console.log, warn, error
- `navigation` - Page navigation events
- `dialog` - Alert/confirm/prompt dialogs
- `error` - Page errors

## Usage Example

```
# Start navigation - events begin streaming
stream_navigate url="https://example.com"

# Check what happened
stream_get_events since_id=0

# Click something
stream_click selector="button.submit"

# Get only DOM changes
stream_get_events types=["dom_change"] since_id=5

# Full snapshot with recent events
stream_snapshot
```

## Configuration

Edit `server.js` CONFIG object:

```javascript
const CONFIG = {
  headless: false,      // Visible browser
  viewport: { width: 1280, height: 720 },
  eventBufferSize: 100, // Max events in buffer
  slowMo: 50,           // Slow down for visibility
};
```
