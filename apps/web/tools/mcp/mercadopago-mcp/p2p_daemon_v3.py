#!/usr/bin/env python3
"""
P2P Automation Daemon v3 - Optimized
====================================

Optimizations applied:
- OPT-1: Smart waits instead of fixed timeouts
- OPT-2: Reusable HTTP session
- OPT-3: Separate pages for parallel tasks
- OPT-4: Async logging
- OPT-5: Price cache with TTL
- OPT-6: Price update debouncing
- OPT-7: Batch state saving
- OPT-8: Class-based architecture

Usage:
    python p2p_daemon_v3.py

Requirements:
    pip install playwright aiohttp aiofiles
    playwright install chromium
"""

import asyncio
import json
import os
import re
import subprocess
import time
from datetime import datetime
from typing import Optional, Dict, List, Any

import aiohttp
import aiofiles
from playwright.async_api import async_playwright, Page, BrowserContext, Playwright

# ==============================================================================
# RETRY UTILITIES
# ==============================================================================

async def retry_with_backoff(
    operation,
    max_attempts: int = 5,
    base_delay: float = 0.2,
    max_delay: float = 10.0,
    exceptions: tuple = (Exception,),
    on_retry=None
):
    """
    Execute operation with exponential backoff retry.
    """
    last_error = None
    for attempt in range(1, max_attempts + 1):
        try:
            return await operation()
        except exceptions as e:
            last_error = e
            if attempt == max_attempts:
                raise
            delay = min(base_delay * (2 ** (attempt - 1)), max_delay)
            if on_retry:
                on_retry(attempt, e, delay)
            await asyncio.sleep(delay)
    raise last_error


# ==============================================================================
# VALIDATION UTILITIES
# ==============================================================================

def validate_cvu(cvu: str) -> bool:
    """Validate Argentine CVU format (22 digits)."""
    if not cvu:
        return False
    cvu_clean = cvu.replace(" ", "").replace("-", "")
    return cvu_clean.isdigit() and len(cvu_clean) == 22


def validate_cbu(cbu: str) -> bool:
    """Validate Argentine CBU format with full checksum verification."""
    if not cbu:
        return False
    cbu_clean = cbu.replace(" ", "").replace("-", "")
    if not cbu_clean.isdigit() or len(cbu_clean) != 22:
        return False

    # Verify first block checksum (positions 1-7, verifier at 8)
    weights1 = [7, 1, 3, 9, 7, 1, 3]
    sum1 = sum(int(cbu_clean[i]) * weights1[i] for i in range(7))
    check1 = (10 - (sum1 % 10)) % 10
    if int(cbu_clean[7]) != check1:
        return False

    # Verify second block checksum (positions 9-21, verifier at 22)
    weights2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3]
    sum2 = sum(int(cbu_clean[8 + i]) * weights2[i] for i in range(13))
    check2 = (10 - (sum2 % 10)) % 10
    if int(cbu_clean[21]) != check2:
        return False

    return True


def validate_alias(alias: str) -> bool:
    """Validate MercadoPago alias format."""
    if not alias:
        return False
    pattern = r'^[a-zA-Z0-9.\-]{6,20}$'
    return bool(re.match(pattern, alias))


def validate_transfer_destination(destination: str, country: str = 'AR') -> tuple:
    """
    Validate transfer destination and return (is_valid, dest_type, cleaned_value).
    """
    if not destination:
        return (False, 'unknown', '')

    dest_clean = destination.strip()

    if country == 'AR':
        if validate_cvu(dest_clean):
            return (True, 'cvu', dest_clean.replace(" ", "").replace("-", ""))
        if validate_cbu(dest_clean):
            return (True, 'cbu', dest_clean.replace(" ", "").replace("-", ""))
        if validate_alias(dest_clean):
            return (True, 'alias', dest_clean)

    return (False, 'unknown', dest_clean)


# ==============================================================================
# JS INJECTION SANITIZATION (SECURITY FIX)
# ==============================================================================

def sanitize_ad_type(ad_type: str) -> str:
    """Sanitize ad_type to prevent JS injection. Only allows 'buy' or 'sell'."""
    ad_type_lower = str(ad_type).lower().strip()
    if ad_type_lower in ('buy', 'sell'):
        return ad_type_lower
    raise ValueError(f"Invalid ad_type: {ad_type}. Must be 'buy' or 'sell'")


def sanitize_asset_fiat(value: str) -> str:
    """Sanitize asset/fiat codes. Only allows alphanumeric, max 10 chars."""
    if not value:
        raise ValueError("Empty asset/fiat value")
    clean = str(value).strip().upper()
    if not clean.isalnum() or len(clean) > 10:
        raise ValueError(f"Invalid asset/fiat: {value}. Must be alphanumeric, max 10 chars")
    return clean


def sanitize_js_string(value: str, max_length: int = 50) -> str:
    """Sanitize a string for safe JS interpolation. Escapes quotes and special chars."""
    if not value:
        return ''
    clean = str(value)[:max_length]
    # Escape single quotes, backslashes, and newlines
    clean = clean.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n').replace('\r', '\\r')
    return clean


# ==============================================================================
# SAFETY CLASSES (CRITICAL - prevent duplicate/runaway transfers)
# ==============================================================================

class TransferRateLimiter:
    """Rate limiter to prevent runaway transfers."""

    def __init__(self, max_per_minute: int = 3, max_per_hour: int = 20,
                 max_daily_amount: float = 50000000):  # 50M ARS default
        self.max_per_minute = max_per_minute
        self.max_per_hour = max_per_hour
        self.max_daily_amount = max_daily_amount
        self._minute_window: List[float] = []
        self._hour_window: List[float] = []
        self._daily_amount: float = 0
        self._daily_date: str = datetime.now().strftime("%Y-%m-%d")
        self._lock = asyncio.Lock()

    async def can_transfer(self, amount: float) -> tuple:
        """Check if transfer is allowed. Returns (allowed, reason)."""
        async with self._lock:
            now = time.time()
            today = datetime.now().strftime("%Y-%m-%d")

            # Reset daily if new day
            if today != self._daily_date:
                self._daily_date = today
                self._daily_amount = 0

            # Clean old entries from sliding windows
            self._minute_window = [t for t in self._minute_window if now - t < 60]
            self._hour_window = [t for t in self._hour_window if now - t < 3600]

            # Check rate limits
            if len(self._minute_window) >= self.max_per_minute:
                return (False, f"Rate limit: {self.max_per_minute}/min exceeded")

            if len(self._hour_window) >= self.max_per_hour:
                return (False, f"Rate limit: {self.max_per_hour}/hour exceeded")

            if self._daily_amount + amount > self.max_daily_amount:
                return (False, f"Daily limit: ${self.max_daily_amount:,.0f} exceeded")

            return (True, "OK")

    async def record_transfer(self, amount: float):
        """Record a successful transfer."""
        async with self._lock:
            now = time.time()
            self._minute_window.append(now)
            self._hour_window.append(now)
            self._daily_amount += amount


class IdempotencyStore:
    """Track transfer idempotency to prevent duplicates."""

    def __init__(self, ttl_hours: int = 24):
        self.ttl_seconds = ttl_hours * 3600
        self._keys: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    @staticmethod
    def generate_key(order_id: str, destination: str, amount: float) -> str:
        """Generate idempotency key for a transfer."""
        import hashlib
        data = f"{order_id}:{destination}:{amount:.2f}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]

    async def check_and_set(self, key: str) -> bool:
        """Check if key exists. If not, set it and return True. If exists, return False."""
        async with self._lock:
            now = time.time()

            # Clean expired keys
            self._keys = {k: v for k, v in self._keys.items()
                         if now - v < self.ttl_seconds}

            if key in self._keys:
                return False

            self._keys[key] = now
            return True

    async def remove(self, key: str):
        """Remove a key (for rollback on failure)."""
        async with self._lock:
            self._keys.pop(key, None)


class OrderProcessingLock:
    """Prevent concurrent processing of the same order."""

    def __init__(self):
        self._processing: set = set()
        self._lock = asyncio.Lock()

    async def acquire(self, order_id: str) -> bool:
        """Try to acquire lock for order. Returns False if already processing."""
        async with self._lock:
            if order_id in self._processing:
                return False
            self._processing.add(order_id)
            return True

    async def release(self, order_id: str):
        """Release lock for order."""
        async with self._lock:
            self._processing.discard(order_id)


# ==============================================================================
# CONFIGURATION
# ==============================================================================

CONFIG_FILE = "/home/edu/autorenta/apps/web/tools/mercadopago-mcp/p2p_config.json"

# Optimization constants
MIN_PRICE_CHANGE = 1.0  # Only update if price changes by more than $1
MIN_UPDATE_INTERVAL = 120  # Minimum seconds between price updates
PRICE_CACHE_TTL = 30  # Cache prices for 30 seconds
STATE_FLUSH_INTERVAL = 30  # Save state every 30 seconds


# ==============================================================================
# ASYNC LOGGER (OPT-4) - Enhanced with real-time streaming
# ==============================================================================

import sys

class AsyncLogger:
    """Non-blocking async logger with real-time streaming, colors, and JSON support."""

    COLORS = {
        'INFO': '\033[97m',      # White
        'WARN': '\033[93m',      # Yellow
        'ERROR': '\033[91m',     # Red
        'SUCCESS': '\033[92m',   # Green
        'DEBUG': '\033[90m',     # Gray
        'BINANCE': '\033[38;5;214m',  # Orange
        'MP': '\033[38;5;39m',   # Blue (MercadoPago)
        'PRICE': '\033[38;5;183m',  # Light purple
        'ORDER': '\033[38;5;219m',  # Pink
        'RESET': '\033[0m'
    }

    EMOJIS = {
        'INFO': 'ℹ️ ',
        'WARN': '⚠️ ',
        'ERROR': '❌',
        'SUCCESS': '✅',
        'DEBUG': '🔍',
        'BINANCE': '🟡',
        'MP': '💳',
        'PRICE': '💰',
        'ORDER': '📋',
    }

    def __init__(self, log_file: str, json_log_file: str = None):
        self.log_file = log_file
        self.json_log_file = json_log_file or log_file.replace('.log', '.json.log')
        self._queue: asyncio.Queue = asyncio.Queue()
        self._json_queue: asyncio.Queue = asyncio.Queue()
        self._task: Optional[asyncio.Task] = None
        self._json_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the background log writers."""
        self._task = asyncio.create_task(self._writer_loop())
        self._json_task = asyncio.create_task(self._json_writer_loop())

    async def stop(self):
        """Stop the logger gracefully."""
        for task in [self._task, self._json_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    async def _writer_loop(self):
        """Background task that writes logs to file."""
        while True:
            try:
                line = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                async with aiofiles.open(self.log_file, 'a') as f:
                    await f.write(line + '\n')
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                while not self._queue.empty():
                    line = self._queue.get_nowait()
                    async with aiofiles.open(self.log_file, 'a') as f:
                        await f.write(line + '\n')
                raise

    async def _json_writer_loop(self):
        """Write JSON structured logs to separate file."""
        while True:
            try:
                log_entry = await asyncio.wait_for(self._json_queue.get(), timeout=1.0)
                async with aiofiles.open(self.json_log_file, 'a') as f:
                    await f.write(json.dumps(log_entry) + '\n')
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                while not self._json_queue.empty():
                    log_entry = self._json_queue.get_nowait()
                    async with aiofiles.open(self.json_log_file, 'a') as f:
                        await f.write(json.dumps(log_entry) + '\n')
                raise

    def log(self, msg: str, level: str = "INFO", **extra):
        """Log a message with color output to stderr for real-time streaming."""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        color = self.COLORS.get(level, self.COLORS['INFO'])
        reset = self.COLORS['RESET']
        emoji = self.EMOJIS.get(level, '')
        colored_line = f"{color}[{timestamp}] {emoji} {msg}{reset}"
        print(colored_line, file=sys.stderr, flush=True)
        plain_line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] [{level}] {msg}"
        try:
            self._queue.put_nowait(plain_line)
        except asyncio.QueueFull:
            pass
        if extra:
            self.log_structured(level, msg, **extra)

    def log_structured(self, level: str, message: str, **data):
        """Write structured JSON log entry for analytics and monitoring."""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
            **data
        }
        try:
            self._json_queue.put_nowait(log_entry)
        except asyncio.QueueFull:
            pass


# ==============================================================================
# STATE MANAGER (OPT-7)
# ==============================================================================

class StateManager:
    """Manages state with batch saving."""

    def __init__(self, file_path: str, flush_interval: int = STATE_FLUSH_INTERVAL):
        self.file_path = file_path
        self.flush_interval = flush_interval
        self._state: Dict = {}
        self._dirty = False
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    async def start(self):
        """Load state and start flush loop."""
        await self._load()
        self._task = asyncio.create_task(self._flush_loop())

    async def stop(self):
        """Stop and save final state."""
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        await self._save()

    async def _load(self):
        """Load state from file."""
        if os.path.exists(self.file_path):
            async with aiofiles.open(self.file_path, 'r') as f:
                content = await f.read()
                self._state = json.loads(content) if content else {}
                # Convert lists to sets for O(1) lookup
                for key in ['processed_orders', 'released_orders']:
                    if key in self._state and isinstance(self._state[key], list):
                        self._state[key] = set(self._state[key])
        else:
            self._state = self._default_state()

    async def _save(self):
        """Save state to file."""
        async with self._lock:
            if self._dirty:
                # Convert sets to lists for JSON serialization
                state_for_json = self._state.copy()
                for key in ['processed_orders', 'released_orders']:
                    if key in state_for_json and isinstance(state_for_json[key], set):
                        state_for_json[key] = list(state_for_json[key])
                temp_file = f"{self.file_path}.tmp"
                async with aiofiles.open(temp_file, 'w') as f:
                    await f.write(json.dumps(state_for_json, indent=2))
                os.replace(temp_file, self.file_path)  # Atomic on POSIX
                self._dirty = False

    async def _flush_loop(self):
        """Periodically save state."""
        while True:
            await asyncio.sleep(self.flush_interval)
            await self._save()

    def _default_state(self) -> Dict:
        return {
            "processed_orders": set(),  # Use set for O(1) lookup
            "released_orders": set(),   # Use set for O(1) lookup
            "daily_volume_ars": 0,
            "daily_volume_date": datetime.now().strftime("%Y-%m-%d"),
            "error_count": 0,
            "last_price_update": None,
            "current_ad_prices": {}
        }

    def get(self, key: str, default=None):
        return self._state.get(key, default)

    def set(self, key: str, value: Any):
        self._state[key] = value
        self._dirty = True

    def append_to_list(self, key: str, value: Any):
        if key not in self._state:
            self._state[key] = []
        self._state[key].append(value)
        self._dirty = True

    def add_to_set(self, key: str, value: Any):
        """Add value to a set (O(1) lookup, no duplicates)."""
        if key not in self._state:
            self._state[key] = set()
        self._state[key].add(value)
        self._dirty = True

    def increment(self, key: str, amount: float = 1):
        self._state[key] = self._state.get(key, 0) + amount
        self._dirty = True


# ==============================================================================
# PRICE CACHE (OPT-5)
# ==============================================================================

class PriceCache:
    """Cache competitor prices with TTL."""

    def __init__(self, ttl_seconds: int = PRICE_CACHE_TTL):
        self.ttl = ttl_seconds
        self._cache: Dict[str, tuple] = {}
        self._lock = asyncio.Lock()

    def _make_key(self, asset: str, fiat: str, trade_type: str) -> str:
        return f"{asset}:{fiat}:{trade_type}"

    async def get(self, asset: str, fiat: str, trade_type: str) -> Optional[List[Dict]]:
        """Get cached prices if not expired."""
        key = self._make_key(asset, fiat, trade_type)
        async with self._lock:
            if key in self._cache:
                data, timestamp = self._cache[key]
                if time.time() - timestamp < self.ttl:
                    return data
                del self._cache[key]
        return None

    async def set(self, asset: str, fiat: str, trade_type: str, data: List[Dict]):
        """Cache prices."""
        key = self._make_key(asset, fiat, trade_type)
        async with self._lock:
            self._cache[key] = (data, time.time())

    def invalidate(self, asset: str = None, fiat: str = None, trade_type: str = None):
        """Clear cache entries."""
        if asset and fiat and trade_type:
            key = self._make_key(asset, fiat, trade_type)
            self._cache.pop(key, None)
        else:
            self._cache.clear()


# ==============================================================================
# P2P DAEMON CLASS (OPT-8)
# ==============================================================================

class P2PDaemon:
    """Main P2P automation daemon with all optimizations."""

    def __init__(self, config_path: str = CONFIG_FILE):
        self.config_path = config_path
        self.config: Dict = {}

        # Components
        self.logger: Optional[AsyncLogger] = None
        self.state: Optional[StateManager] = None
        self.price_cache: Optional[PriceCache] = None
        self.http_session: Optional[aiohttp.ClientSession] = None

        # Playwright
        self._playwright: Optional[Playwright] = None
        self.browser: Optional[BrowserContext] = None

        # Pages (OPT-3: separate pages for parallel tasks)
        self.order_page: Optional[Page] = None
        self.price_page: Optional[Page] = None
        self.mp_page: Optional[Page] = None

        # CRITICAL: Safety components
        self.rate_limiter: Optional[TransferRateLimiter] = None
        self.idempotency: Optional[IdempotencyStore] = None
        self.order_lock: Optional[OrderProcessingLock] = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, *args):
        await self.stop()

    def _load_config(self) -> Dict:
        """Load configuration from JSON file."""
        with open(self.config_path, 'r') as f:
            return json.load(f)

    def log(self, msg: str, level: str = "INFO"):
        """Log a message."""
        if self.logger:
            self.logger.log(msg, level)
        else:
            print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] [{level}] {msg}")

    async def start(self):
        """Initialize all components."""
        # Load config
        self.config = self._load_config()

        # Initialize logger (OPT-4)
        self.logger = AsyncLogger(self.config.get('log_file', '/tmp/p2p_daemon_v3.log'))
        await self.logger.start()

        self.log("=" * 70)
        self.log("P2P AUTOMATION DAEMON v3 (Optimized)")
        self.log("=" * 70)

        # Initialize state manager (OPT-7)
        self.state = StateManager(
            self.config.get('state_file', '/tmp/daemon_state_v3.json'),
            flush_interval=STATE_FLUSH_INTERVAL
        )
        await self.state.start()

        # Initialize price cache (OPT-5)
        self.price_cache = PriceCache(ttl_seconds=PRICE_CACHE_TTL)

        # CRITICAL: Initialize safety components
        safety_config = self.config.get('safety', {})
        self.rate_limiter = TransferRateLimiter(
            max_per_minute=safety_config.get('max_transfers_per_minute', 3),
            max_per_hour=safety_config.get('max_transfers_per_hour', 20),
            max_daily_amount=safety_config.get('max_daily_transfer_ars', 50000000)
        )
        self.idempotency = IdempotencyStore(ttl_hours=24)
        self.order_lock = OrderProcessingLock()
        self.log("Safety components initialized (rate limiter, idempotency, order lock)")

        # DRY-RUN MODE indicator
        if self.config.get('dry_run', False):
            self.log("=" * 70, "WARN")
            self.log("DRY-RUN MODE ENABLED - No real transfers will be executed", "WARN")
            self.log("=" * 70, "WARN")

        # Initialize HTTP session (OPT-2)
        self.http_session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10),
            headers={
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
            }
        )

        # Initialize browser
        self.log("Starting browser...")
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch_persistent_context(
            self.config.get('browser_profile', '/home/edu/.p2p-automation-profile'),
            headless=self.config.get('headless', False),
            viewport={'width': 1400, 'height': 900}
        )

        # Create separate pages (OPT-3)
        # Use initial page from context to avoid 4+ tabs
        existing_pages = self.browser.pages
        if existing_pages:
            self.order_page = existing_pages[0]
        else:
            self.order_page = await self.browser.new_page()

        self.price_page = await self.browser.new_page()
        self.mp_page = await self.browser.new_page()

        # Track page closures
        self._pages_closed = False
        for page in [self.order_page, self.price_page, self.mp_page]:
            page.on('close', lambda: self._on_page_closed())

        self.log("Browser ready with 3 pages")

    def _on_page_closed(self):
        """Handle page close event."""
        self._pages_closed = True
        self.log("⚠️ A browser page was closed! Daemon will stop.", "ERROR")

    async def stop(self):
        """Cleanup all components."""
        self.log("Shutting down...")

        # Close pages
        for page in [self.order_page, self.price_page, self.mp_page]:
            if page:
                await page.close()

        # Close browser
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()

        # Close HTTP session
        if self.http_session:
            await self.http_session.close()

        # Stop state manager (saves final state)
        if self.state:
            await self.state.stop()

        # Stop logger
        if self.logger:
            await self.logger.stop()

    def notify(self, title: str, message: str):
        """Send notifications."""
        notifications = self.config.get('notifications', {})

        if notifications.get('sound', True):
            subprocess.Popen(
                ['paplay', '/usr/share/sounds/freedesktop/stereo/complete.oga'],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )

        if notifications.get('desktop', True):
            subprocess.Popen(
                ['notify-send', title, message],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )

    # ==========================================================================
    # SMART WAITS (OPT-1)
    # ==========================================================================

    async def wait_for_page_ready(self, page: Page, selector: str = None, timeout: int = 10000):
        """Wait for page to be ready using smart waits instead of fixed timeouts."""
        try:
            await page.wait_for_load_state('domcontentloaded', timeout=timeout)
            if selector:
                await page.wait_for_selector(selector, state='visible', timeout=timeout)
        except asyncio.TimeoutError:
            # Expected timeout, fallback to short wait
            await page.wait_for_timeout(1000)
        except Exception as e:
            # Log unexpected errors for debugging
            self.log(f"wait_for_page_ready error: {type(e).__name__}: {e}", "DEBUG")
            await page.wait_for_timeout(1000)

    async def wait_for_navigation(self, page: Page, timeout: int = 10000):
        """Wait for navigation to complete."""
        try:
            await page.wait_for_load_state('networkidle', timeout=timeout)
        except asyncio.TimeoutError:
            # Expected timeout, just continue
            await page.wait_for_timeout(500)
        except Exception as e:
            self.log(f"wait_for_navigation error: {type(e).__name__}: {e}", "DEBUG")
            await page.wait_for_timeout(500)

    # ==========================================================================
    # MERCADOPAGO OPERATIONS
    # ==========================================================================

    async def set_amount_react(self, page: Page, amount: int) -> bool:
        """Set amount using React's internal onChange handler."""
        amount_str = str(amount)
        for i in range(1, len(amount_str) + 1):
            partial = amount_str[:i]
            await page.evaluate(f"""
            (() => {{
                const input = document.getElementById('amount-field-input');
                if (!input) return;
                const rk = Object.keys(input).find(k => k.startsWith('__reactFiber'));
                if (!rk) return;
                let cur = input[rk], onChange = null;
                for (let i = 0; i < 15 && cur; i++) {{
                    if (cur.memoizedProps?.onChange) {{ onChange = cur.memoizedProps.onChange; break; }}
                    cur = cur.return;
                }}
                if (onChange) onChange({{ target: {{ value: '{partial}' }} }});
            }})()
            """)
            await asyncio.sleep(0.05)  # Minimal delay
        return True

    async def execute_mp_transfer(self, alias_or_cvu: str, amount: int, order_id: str = "") -> bool:
        """Execute MercadoPago transfer using dedicated MP page with safety checks."""
        page = self.mp_page

        # Validate destination before proceeding
        is_valid, dest_type, cleaned_dest = validate_transfer_destination(alias_or_cvu, country='AR')
        if not is_valid:
            self.log(f"  INVALID destination format: {alias_or_cvu}", "ERROR")
            self.logger.log_structured("ERROR", "Invalid transfer destination",
                                       destination=alias_or_cvu, amount=amount, validation_failed=True)
            return False

        # Validate amount
        if amount <= 0:
            self.log(f"  INVALID amount: {amount}", "ERROR")
            return False

        safety = self.config.get('safety', {})
        max_single = safety.get('max_single_order_ars', 500000)
        if amount > max_single:
            self.log(f"  Amount ${amount:,} exceeds limit ${max_single:,}", "ERROR")
            return False

        # CRITICAL: Check rate limiter
        can_transfer, rate_reason = await self.rate_limiter.can_transfer(float(amount))
        if not can_transfer:
            self.log(f"  BLOCKED by rate limiter: {rate_reason}", "ERROR")
            self.logger.log_structured("BLOCKED", "Rate limit exceeded",
                                       destination=cleaned_dest, amount=amount, reason=rate_reason)
            return False

        # CRITICAL: Check idempotency
        idempotency_key = IdempotencyStore.generate_key(order_id or "unknown", cleaned_dest, float(amount))
        if not await self.idempotency.check_and_set(idempotency_key):
            self.log(f"  BLOCKED: Duplicate transfer detected (key={idempotency_key})", "ERROR")
            self.logger.log_structured("BLOCKED", "Duplicate transfer",
                                       destination=cleaned_dest, amount=amount, idempotency_key=idempotency_key)
            return False

        self.log(f"  Transferring ${amount:,} ARS to {cleaned_dest} ({dest_type})", "MP")
        self.logger.log_structured("INFO", "Starting transfer",
                                   destination=cleaned_dest, amount=amount, dest_type=dest_type,
                                   order_id=order_id, idempotency_key=idempotency_key)

        # DRY-RUN MODE: Simulate transfer without executing
        if self.config.get('dry_run', False):
            self.log(f"  [DRY-RUN] Would transfer ${amount:,} ARS to {cleaned_dest}", "SUCCESS")
            self.logger.log_structured("DRY_RUN", "Simulated transfer",
                                       destination=cleaned_dest, amount=amount,
                                       dest_type=dest_type, order_id=order_id)
            # Record in rate limiter even in dry-run to test limits
            await self.rate_limiter.record_transfer(float(amount))
            return True

        try:
            await page.goto('https://www.mercadopago.com.ar/home')
            await self.wait_for_page_ready(page, 'text=Transferir')

            await page.click('text=Transferir')
            await self.wait_for_page_ready(page, 'text=Con CBU, CVU o alias')

            await page.click('text=Con CBU, CVU o alias')
            await self.wait_for_page_ready(page, 'input')

            await page.fill('input', alias_or_cvu)
            await page.click('text=Continuar')

            try:
                await page.wait_for_selector('text=Confirmar cuenta', timeout=10000)
                await page.click('text=Confirmar cuenta')
            except Exception:
                self.log("  Account not found", "ERROR")
                return False

            await page.wait_for_selector('#amount-field-input', timeout=10000)
            await self.set_amount_react(page, amount)

            await page.click('text=Continuar')
            await page.wait_for_selector('text=Revisá si está todo bien', timeout=10000)

            transfer_btn = await page.query_selector('button:has-text("Transferir")')
            if transfer_btn:
                await transfer_btn.click()

            await self.wait_for_navigation(page)

            # Check for QR
            qr_visible = await page.query_selector('text=Escaneá el QR')
            if qr_visible:
                self.log("  QR REQUIRED - Scan with app!", "WARN")
                self.notify("P2P Daemon", "QR required for transfer")
                try:
                    await page.wait_for_selector('text=Le transferiste', timeout=120000)
                    self.log("  Transfer successful!", "SUCCESS")
                    await self.rate_limiter.record_transfer(float(amount))  # Record success
                    self.logger.log_structured("SUCCESS", "Transfer completed (QR)",
                                               destination=cleaned_dest, amount=amount)
                    return True
                except Exception:
                    self.log("  QR timeout", "ERROR")
                    await self.idempotency.remove(idempotency_key)  # Rollback
                    return False

            success = await page.query_selector('text=Le transferiste')
            if success:
                self.log("  Transfer successful!", "SUCCESS")
                await self.rate_limiter.record_transfer(float(amount))  # Record success
                self.logger.log_structured("SUCCESS", "Transfer completed",
                                           destination=cleaned_dest, amount=amount)
                return True

            # Transfer failed - rollback idempotency
            await self.idempotency.remove(idempotency_key)
            return False

        except Exception as e:
            self.log(f"  Transfer error: {e}", "ERROR")
            await self.idempotency.remove(idempotency_key)  # Rollback on error
            return False

    async def check_mp_payment_received(self, expected_amount: int,
                                        time_window_minutes: int = 30,
                                        tolerance_percent: float = 1) -> Dict:
        """Check if we received a payment in MercadoPago."""
        page = self.mp_page
        self.log(f"  Checking for ${expected_amount:,} ARS payment in MP...", "MP")

        try:
            await page.goto('https://www.mercadopago.com.ar/activities')
            await self.wait_for_page_ready(page, '[data-testid="activity-row"], .activity-row')

            min_amount = expected_amount * (1 - tolerance_percent / 100)
            max_amount = expected_amount * (1 + tolerance_percent / 100)

            activities = await page.evaluate("""
            () => {
                const items = document.querySelectorAll('[data-testid="activity-row"], .activity-row, [class*="ActivityRow"]');
                return Array.from(items).slice(0, 20).map(item => {
                    const text = item.innerText || '';
                    const isIncoming = text.includes('Te transfirieron') ||
                                       text.includes('Recibiste') ||
                                       text.includes('cobro');
                    const amountMatch = text.match(/\\$\\s*([\\d.,]+)/);
                    const amount = amountMatch ?
                        parseFloat(amountMatch[1].replace(/\\./g, '').replace(',', '.')) : 0;
                    const lines = text.split('\\n').filter(l => l.trim());
                    return {
                        is_incoming: isIncoming,
                        amount: amount,
                        from_name: lines[0] || ''
                    };
                });
            }
            """)

            for activity in activities:
                if activity['is_incoming'] and min_amount <= activity['amount'] <= max_amount:
                    self.log(f"  Payment found: ${activity['amount']:,.2f} from {activity['from_name']}")
                    return {
                        'received': True,
                        'amount': activity['amount'],
                        'from_name': activity['from_name']
                    }

            self.log(f"  Payment of ${expected_amount:,} ARS not found", "WARN")
            return {'received': False}

        except Exception as e:
            self.log(f"  Error checking MP payment: {e}", "ERROR")
            return {'received': False, 'error': str(e)}

    # ==========================================================================
    # BINANCE P2P OPERATIONS
    # ==========================================================================

    async def extract_binance_orders(self) -> List[Dict]:
        """Extract orders from Binance P2P orders page."""
        page = self.order_page

        await page.goto('https://p2p.binance.com/en/fiatOrder?tab=1')
        await self.wait_for_page_ready(page, 'table tbody tr')

        orders = await page.evaluate("""
        () => {
            const rows = document.querySelectorAll('table tbody tr');
            return Array.from(rows).map(row => {
                const cells = row.querySelectorAll('td');
                const link = row.querySelector('a[href*="fiatOrderDetail"]');
                const orderNum = link?.textContent?.match(/\\d{19,20}/)?.[0];
                const typeCell = cells[1]?.textContent || '';
                const isBuy = typeCell.includes('Buy');
                const statusCell = cells[5]?.textContent || '';
                const statusLower = statusCell.toLowerCase();

                let status = 'unknown';
                if (statusLower.includes('to pay') || statusLower.includes('pending payment')) {
                    status = 'to_pay';
                } else if (statusLower.includes('paid') || statusLower.includes('payment received')) {
                    status = 'paid';
                } else if (statusLower.includes('completed')) {
                    status = 'completed';
                } else if (statusLower.includes('cancelled')) {
                    status = 'cancelled';
                }

                const amountText = cells[2]?.textContent || '';
                const amountMatch = amountText.match(/([\\d,.]+)/);
                const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
                const counterparty = cells[4]?.textContent?.trim() || '';

                return {
                    order_number: orderNum,
                    type: isBuy ? 'buy' : 'sell',
                    amount_fiat: amount,
                    counterparty: counterparty,
                    status: status,
                    href: link?.href
                };
            }).filter(o => o.order_number);
        }
        """)

        return orders

    async def get_order_payment_details(self, order_href: str, order_id: str = None) -> Dict:
        """Get payment details from order detail page with error handling."""
        page = self.order_page

        try:
            await page.goto(order_href)
            await self.wait_for_page_ready(page)

            details = await page.evaluate("""
            () => {
                const text = document.body.innerText;
                const cvuMatch = text.match(/\\b(\\d{22})\\b/);
                const aliasMatch = text.match(/([a-zA-Z0-9]+\\.[a-zA-Z0-9]+\\.[a-zA-Z0-9]+)/);
                return {
                    cvu: cvuMatch ? cvuMatch[1] : null,
                    alias: aliasMatch ? aliasMatch[1] : null
                };
            }
            """)

            # Log structured data for monitoring
            if details.get('cvu') or details.get('alias'):
                self.logger.log_structured("INFO", "Payment details extracted",
                                           order_id=order_id, has_cvu=bool(details.get('cvu')),
                                           has_alias=bool(details.get('alias')))
            else:
                self.log(f"  No CVU/Alias found in order page", "WARN")
                self.logger.log_structured("WARN", "No payment details found",
                                           order_id=order_id, order_href=order_href)

            return details

        except Exception as e:
            self.log(f"  Error getting payment details: {e}", "ERROR")
            self.logger.log_structured("ERROR", "Failed to get payment details",
                                       order_id=order_id, error=str(e))
            return {'cvu': None, 'alias': None, 'error': str(e)}

    async def mark_order_as_paid(self, order_href: str, order_id: str = None) -> bool:
        """Mark a BUY order as paid in Binance with lock protection."""
        page = self.order_page

        # CRITICAL: Verify order not already marked to prevent duplicate actions
        if order_id and order_id in (self.state.get('processed_orders') or set()):
            self.log(f"  Order {order_id} already marked as paid, skipping", "WARN")
            return True  # Return True as it's already done

        try:
            await page.goto(order_href)
            await self.wait_for_page_ready(page)

            # Check if already in 'paid' state before clicking
            page_text = await page.evaluate("() => document.body.innerText")
            if 'Waiting for seller' in page_text or 'Esperando al vendedor' in page_text:
                self.log("  Order already marked as paid", "INFO")
                return True

            for btn_text in ['Transferred', 'paid', 'Pagado']:
                btn = await page.query_selector(f'button:has-text("{btn_text}")')
                if btn:
                    await btn.click()
                    await asyncio.sleep(0.5)
                    confirm = await page.query_selector('button:has-text("Confirm")')
                    if confirm:
                        await confirm.click()
                    self.log("  Marked as paid in Binance", "SUCCESS")
                    self.logger.log_structured("SUCCESS", "Order marked as paid",
                                               order_id=order_id, order_href=order_href)
                    return True

            self.log("  'Mark as paid' button not found", "WARN")
            return False

        except Exception as e:
            self.log(f"  Error marking as paid: {e}", "ERROR")
            self.logger.log_structured("ERROR", "Failed to mark as paid",
                                       order_id=order_id, error=str(e))
            return False

    async def release_crypto(self, order_href: str, order_id: str = None) -> bool:
        """Release crypto for a SELL order with duplicate protection."""
        page = self.order_page

        # CRITICAL: Verify order not already released to prevent double release
        if order_id and order_id in (self.state.get('released_orders') or set()):
            self.log(f"  Order {order_id} already released, skipping", "WARN")
            self.logger.log_structured("WARN", "Duplicate release prevented",
                                       order_id=order_id)
            return True  # Return True as it's already done

        try:
            await page.goto(order_href)
            await self.wait_for_page_ready(page)

            # Check if already released/completed before clicking
            page_text = await page.evaluate("() => document.body.innerText")
            if 'Completed' in page_text or 'Completada' in page_text or 'Released' in page_text:
                self.log("  Order already completed/released", "INFO")
                self.logger.log_structured("INFO", "Order already released",
                                           order_id=order_id)
                return True

            for btn_text in ['Release', 'Liberar', 'Confirm']:
                btn = await page.query_selector(f'button:has-text("{btn_text}")')
                if btn:
                    await btn.click()
                    await asyncio.sleep(0.5)

                    # Check for 2FA
                    twofa = await page.query_selector('input[placeholder*="2FA"], input[placeholder*="código"]')
                    if twofa:
                        self.log("  2FA REQUIRED - Enter code manually", "WARN")
                        self.notify("P2P Daemon", "2FA required to release USDT")
                        try:
                            await page.wait_for_selector('text=Released, text=Completed', timeout=120000)
                            self.log("  2FA completed, crypto released!", "SUCCESS")
                            self.logger.log_structured("SUCCESS", "Crypto released (2FA)",
                                                       order_id=order_id)
                            return True
                        except asyncio.TimeoutError:
                            self.log("  2FA timeout", "ERROR")
                            self.logger.log_structured("ERROR", "2FA timeout",
                                                       order_id=order_id)
                            return False
                        except Exception as e:
                            self.log(f"  2FA error: {e}", "ERROR")
                            return False

                    # Check success
                    await asyncio.sleep(1)
                    success = await page.query_selector('text=Released') or await page.query_selector('text=Completed')
                    if success:
                        self.log("  Crypto released successfully!", "SUCCESS")
                        self.logger.log_structured("SUCCESS", "Crypto released",
                                                   order_id=order_id)
                        return True

                    # Try final confirm
                    final_confirm = await page.query_selector('button:has-text("Confirm")')
                    if final_confirm:
                        await final_confirm.click()
                        self.log("  Release confirmed", "SUCCESS")
                        self.logger.log_structured("SUCCESS", "Crypto released (confirmed)",
                                                   order_id=order_id)
                        return True

            self.log("  'Release' button not found", "WARN")
            return False

        except Exception as e:
            self.log(f"  Error releasing crypto: {e}", "ERROR")
            self.logger.log_structured("ERROR", "Failed to release crypto",
                                       order_id=order_id, error=str(e))
            return False

    # ==========================================================================
    # COMPETITOR TRACKING (OPT-5: with cache)
    # ==========================================================================

    async def get_competitor_prices(self, asset: str = 'USDT', fiat: str = 'ARS',
                                    trade_type: str = 'SELL',
                                    payment_methods: List[str] = None) -> List[Dict]:
        """Get competitor prices with caching and retry."""
        if payment_methods is None:
            payment_methods = ['Mercadopago']

        cached = await self.price_cache.get(asset, fiat, trade_type)
        if cached is not None:
            return cached

        payload = {
            'fiat': fiat,
            'asset': asset,
            'tradeType': trade_type.upper(),
            'page': 1,
            'rows': 20,
            'payTypes': payment_methods,
            'publisherType': None,
        }

        async def fetch_prices():
            async with self.http_session.post(
                'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
                json=payload
            ) as response:
                if response.status != 200:
                    raise aiohttp.ClientResponseError(
                        response.request_info, response.history,
                        status=response.status, message=f"API error: {response.status}"
                    )
                return await response.json()

        try:
            data = await retry_with_backoff(
                fetch_prices,
                max_attempts=3,
                base_delay=0.5,
                max_delay=5.0,
                exceptions=(aiohttp.ClientError, asyncio.TimeoutError),
                on_retry=lambda attempt, err, delay: self.log(
                    f"Retry {attempt}/3 fetching prices after {delay:.1f}s: {err}", "WARN"
                )
            )

            if data.get('success') and data.get('data'):
                competitors = [
                    {
                        'advertiser': ad['advertiser']['nickName'],
                        'price': float(ad['adv']['price']),
                        'available': float(ad['adv']['surplusAmount']),
                        'min': float(ad['adv']['minSingleTransAmount']),
                        'max': float(ad['adv']['maxSingleTransAmount']),
                    }
                    for ad in data['data']
                ]
                await self.price_cache.set(asset, fiat, trade_type, competitors)
                self.logger.log_structured("INFO", "Fetched competitor prices",
                                           asset=asset, fiat=fiat, trade_type=trade_type,
                                           count=len(competitors))
                return competitors
            else:
                self.log(f"API returned: success={data.get('success')}, total={data.get('total', 0)}", "DEBUG")

        except Exception as e:
            self.log(f"Error fetching competitor prices after retries: {e}", "ERROR")
            self.logger.log_structured("ERROR", "Failed to fetch prices",
                                       asset=asset, fiat=fiat, error=str(e))

        return []

    def calculate_optimal_price(self, competitors: List[Dict], strategy: str = 'top1',
                               margin: float = 0.5, min_price: float = 0,
                               max_price: float = float('inf')) -> Optional[float]:
        """Calculate optimal price based on strategy."""
        if not competitors or strategy == 'fixed':
            return None

        if strategy == 'top1':
            optimal = competitors[0]['price'] - margin
        elif strategy == 'undercut':
            optimal = competitors[0]['price'] - 0.01
        elif strategy == 'top3_avg':
            top3 = competitors[:3]
            optimal = sum(c['price'] for c in top3) / len(top3)
        else:
            return None

        optimal = max(min_price, min(max_price, optimal))
        return round(optimal, 2)

    async def update_ad_price(self, new_price: float, ad_type: str = 'sell') -> bool:
        """Update price of an existing ad."""
        page = self.price_page

        # SECURITY: Sanitize ad_type to prevent JS injection
        try:
            safe_ad_type = sanitize_ad_type(ad_type)
        except ValueError as e:
            self.log(f"  Invalid ad_type: {e}", "ERROR")
            return False

        await page.goto('https://p2p.binance.com/en/advertiserManage')
        await self.wait_for_page_ready(page, 'table')

        try:
            # Find and click edit
            edit_clicked = await page.evaluate(f"""
            () => {{
                const rows = document.querySelectorAll('table tbody tr, [class*="AdRow"]');
                for (const row of rows) {{
                    const text = row.innerText || '';
                    const isSell = text.includes('Sell') || text.includes('Vender');
                    const isBuy = text.includes('Buy') || text.includes('Comprar');
                    if (('{safe_ad_type}' === 'sell' && isSell) || ('{safe_ad_type}' === 'buy' && isBuy)) {{
                        const editBtn = row.querySelector('button, a');
                        if (editBtn && (editBtn.innerText.includes('Edit') || editBtn.innerText.includes('Editar'))) {{
                            editBtn.click();
                            return true;
                        }}
                    }}
                }}
                return false;
            }}
            """)

            if not edit_clicked:
                edit_btn = await page.query_selector('button:has-text("Edit"), a:has-text("Edit")')
                if edit_btn:
                    await edit_btn.click()

            await asyncio.sleep(1)

            # Update price
            price_input = await page.query_selector('input[name*="price"], input[placeholder*="price"], input[type="number"]')
            if price_input:
                await price_input.fill('')
                await price_input.type(str(new_price))

                save_btn = await page.query_selector('button:has-text("Post"), button:has-text("Save"), button:has-text("Confirm")')
                if save_btn:
                    await save_btn.click()
                    await asyncio.sleep(1)
                    self.log(f"  Price updated to {new_price} ARS", "SUCCESS")
                    return True

        except Exception as e:
            self.log(f"  Error updating price: {e}", "ERROR")

        return False

    # ==========================================================================
    # MAIN LOOPS
    # ==========================================================================

    async def monitor_orders(self):
        """Main loop to monitor and process orders."""
        poll_interval = self.config.get('poll_interval_seconds', 30)

        while True:
            try:
                # Reset daily volume
                today = datetime.now().strftime("%Y-%m-%d")
                if self.state.get('daily_volume_date') != today:
                    self.state.set('daily_volume_ars', 0)
                    self.state.set('daily_volume_date', today)
                    self.state.set('error_count', 0)

                # Check error limit
                safety = self.config.get('safety', {})
                if self.state.get('error_count', 0) >= safety.get('pause_on_error_count', 3):
                    self.log("Too many errors, pausing...", "WARN")
                    self.notify("P2P Daemon", "Paused due to errors")
                    await asyncio.sleep(300)
                    continue

                orders = await self.extract_binance_orders()

                # Process BUY orders
                buy_orders = [o for o in orders if o['type'] == 'buy' and o['status'] == 'to_pay']
                if buy_orders and self.config.get('buy_flow', {}).get('auto_pay', True):
                    for order in buy_orders:
                        order_id = order['order_number']

                        if order_id in (self.state.get('processed_orders') or set()):
                            continue

                        # CRITICAL: Acquire order lock to prevent race conditions
                        if not await self.order_lock.acquire(order_id):
                            self.log(f"   Order {order_id} already being processed", "DEBUG")
                            continue

                        try:
                            self.log(f"━━━ BUY ORDER: {order_id} ━━━", "ORDER")
                            self.log(f"   Amount: ${order['amount_fiat']:,.2f} ARS", "ORDER")

                            # Check limits
                            if order['amount_fiat'] > safety.get('max_single_order_ars', 500000):
                                self.log("   Exceeds limit, skipping", "WARN")
                                continue

                            payment = await self.get_order_payment_details(order['href'], order_id=order_id)
                            dest = payment.get('alias') or payment.get('cvu')

                            if dest:
                                self.log(f"   Destination: {dest}")
                                success = await self.execute_mp_transfer(
                                    dest, int(order['amount_fiat']), order_id=order_id
                                )

                                if success:
                                    if self.config.get('buy_flow', {}).get('mark_as_paid_after_transfer', True):
                                        await self.mark_order_as_paid(order['href'], order_id=order_id)
                                    self.state.add_to_set('processed_orders', order_id)
                                    self.state.increment('daily_volume_ars', order['amount_fiat'])
                                    self.log("   Order processed!", "SUCCESS")
                                else:
                                    self.state.increment('error_count')
                            else:
                                self.log("   CVU/Alias not found", "WARN")
                        finally:
                            await self.order_lock.release(order_id)

                # Process SELL orders
                sell_orders = [o for o in orders if o['type'] == 'sell' and o['status'] == 'paid']
                if sell_orders and self.config.get('sell_flow', {}).get('auto_release', True):
                    for order in sell_orders:
                        order_id = order['order_number']

                        if order_id in (self.state.get('released_orders') or set()):
                            continue

                        # CRITICAL: Acquire order lock to prevent race conditions
                        if not await self.order_lock.acquire(order_id):
                            self.log(f"   Order {order_id} already being processed", "DEBUG")
                            continue

                        try:
                            self.log(f"━━━ SELL ORDER: {order_id} ━━━", "ORDER")
                            self.log(f"   Amount: ${order['amount_fiat']:,.2f} ARS", "ORDER")

                            # Verify payment
                            if self.config.get('sell_flow', {}).get('verify_mp_payment', True):
                                verification = await self.check_mp_payment_received(
                                    int(order['amount_fiat']),
                                    self.config.get('sell_flow', {}).get('payment_verification_window_minutes', 30),
                                    self.config.get('sell_flow', {}).get('amount_tolerance_percent', 1)
                                )

                                if not verification.get('received'):
                                    self.log("   Payment NOT verified, waiting...", "WARN")
                                    continue

                            if await self.release_crypto(order['href'], order_id=order_id):
                                self.state.add_to_set('released_orders', order_id)
                                self.state.increment('daily_volume_ars', order['amount_fiat'])
                                self.log("   USDT released!", "SUCCESS")
                            else:
                                self.state.increment('error_count')
                        finally:
                            await self.order_lock.release(order_id)

                if not buy_orders and not sell_orders:
                    self.log("No pending orders")

            except Exception as e:
                self.log(f"Error in monitor_orders: {e}", "ERROR")
                self.state.increment('error_count')

            await asyncio.sleep(poll_interval)

    async def maintain_top1(self):
        """Loop to maintain ads at Top 1 position with debouncing (OPT-6)."""
        check_interval = self.config.get('price_check_interval_seconds', 60)

        while True:
            try:
                for ad in self.config.get('ads', []):
                    if not ad.get('enabled', True):
                        continue

                    if ad.get('price_strategy') not in ['top1', 'undercut', 'top3_avg']:
                        continue

                    trade_type = 'SELL' if ad['type'] == 'sell' else 'BUY'

                    competitors = await self.get_competitor_prices(
                        asset=ad.get('asset', 'USDT'),
                        fiat=ad.get('fiat', 'ARS'),
                        trade_type=trade_type,
                        payment_methods=ad.get('payment_methods', ['Mercadopago'])
                    )

                    if not competitors:
                        self.log(f"No competitors found for {trade_type}", "WARN")
                        continue

                    optimal = self.calculate_optimal_price(
                        competitors,
                        strategy=ad['price_strategy'],
                        margin=ad.get('price_margin', 0.5),
                        min_price=ad.get('min_price', 0),
                        max_price=ad.get('max_price', float('inf'))
                    )

                    if optimal is None:
                        continue

                    current_price = (self.state.get('current_ad_prices') or {}).get(ad['id'])

                    # OPT-6: Debouncing - skip if change is too small
                    if current_price and abs(current_price - optimal) < MIN_PRICE_CHANGE:
                        continue

                    # OPT-6: Debouncing - skip if updated too recently
                    last_update = self.state.get('last_price_update')
                    if last_update:
                        try:
                            elapsed = (datetime.now() - datetime.fromisoformat(last_update)).total_seconds()
                            if elapsed < MIN_UPDATE_INTERVAL:
                                continue
                        except Exception:
                            pass

                    self.log(f"Price update: {ad['type'].upper()} Top1={competitors[0]['price']:.2f} → Optimal={optimal:.2f}", "PRICE")

                    if await self.update_ad_price(optimal, ad['type']):
                        prices = self.state.get('current_ad_prices') or {}
                        prices[ad['id']] = optimal
                        self.state.set('current_ad_prices', prices)
                        self.state.set('last_price_update', datetime.now().isoformat())

            except Exception as e:
                self.log(f"Error in maintain_top1: {e}", "ERROR")

            await asyncio.sleep(check_interval)

    async def verify_sessions(self):
        """Verify Binance and MercadoPago sessions are active."""
        self.log("Verifying sessions...")

        # Load ALL pages in parallel first
        self.log("Loading all pages in parallel...", "INFO")
        await asyncio.gather(
            self.order_page.goto('https://p2p.binance.com/en/fiatOrder?tab=1'),
            self.price_page.goto('https://p2p.binance.com/en/myads?type=normal&code=default'),
            self.mp_page.goto('https://www.mercadopago.com.ar/home'),
        )
        self.log("All pages loaded", "SUCCESS")

        # Check if any require login
        binance_needs_login = 'login' in self.order_page.url.lower() or 'accounts.binance' in self.order_page.url
        mp_needs_login = 'login' in self.mp_page.url.lower()

        if binance_needs_login:
            self.log("BINANCE: Login required in order_page", "WARN")
            self.notify("P2P Daemon", "Binance login required")

        if mp_needs_login:
            self.log("MERCADOPAGO: Login required", "WARN")
            self.notify("P2P Daemon", "MercadoPago login required")

        # Wait for logins (up to 5 min)
        if binance_needs_login or mp_needs_login:
            self.log("Waiting for logins (up to 5 min)...", "INFO")
            for i in range(60):
                await asyncio.sleep(5)

                binance_ok = 'login' not in self.order_page.url.lower() and 'accounts.binance' not in self.order_page.url
                mp_ok = 'login' not in self.mp_page.url.lower()

                if binance_needs_login and binance_ok:
                    self.log("Binance session ACTIVE", "SUCCESS")
                    binance_needs_login = False

                if mp_needs_login and mp_ok:
                    self.log("MercadoPago session ACTIVE", "SUCCESS")
                    mp_needs_login = False

                if not binance_needs_login and not mp_needs_login:
                    break

                if i % 12 == 0 and i > 0:  # Every 60 sec
                    status = []
                    if binance_needs_login:
                        status.append("Binance")
                    if mp_needs_login:
                        status.append("MP")
                    self.log(f"Still waiting for: {', '.join(status)} ({i*5}s)", "INFO")
        else:
            self.log("Binance session ACTIVE", "SUCCESS")
            self.log("MercadoPago session ACTIVE", "SUCCESS")

    async def run(self):
        """Main entry point."""
        await self.verify_sessions()

        self.log("-" * 70)
        self.log("Daemon started. Press Ctrl+C to stop.")
        self.log("⚠️ DO NOT close any browser tabs!")
        self.log("-" * 70)

        # Run tasks with page close monitoring
        try:
            await asyncio.gather(
                self.monitor_orders(),
                self.maintain_top1(),
                self._monitor_page_health(),
            )
        except asyncio.CancelledError:
            self.log("Tasks cancelled")

    async def _monitor_page_health(self):
        """Monitor if any pages have been closed."""
        while True:
            if self._pages_closed:
                self.log("Page closed detected. Stopping daemon.", "ERROR")
                raise KeyboardInterrupt("Page was closed by user")
            await asyncio.sleep(1)


# ==============================================================================
# MAIN
# ==============================================================================

async def main(dry_run: bool = False):
    async with P2PDaemon() as daemon:
        # Override dry_run from command line
        if dry_run:
            daemon.config['dry_run'] = True
            daemon.log("=" * 70, "WARN")
            daemon.log("DRY-RUN MODE ENABLED via command line", "WARN")
            daemon.log("=" * 70, "WARN")
        await daemon.run()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='P2P Automation Daemon v3 - Argentina')
    parser.add_argument('--dry-run', action='store_true',
                        help='Enable dry-run mode (no real transfers)')
    args = parser.parse_args()

    try:
        asyncio.run(main(dry_run=args.dry_run))
    except KeyboardInterrupt:
        print("\nDaemon stopped")
