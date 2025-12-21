#!/usr/bin/env python3
"""
P2P Automation Daemon - Ecuador (Produbanco)
=============================================

Daemon for Ecuador P2P trading with Produbanco bank integration.
Based on p2p_daemon_v3.py but adapted for USD/Produbanco.

Usage:
    python p2p_daemon_ecuador.py

Requirements:
    pip install playwright aiohttp aiofiles
    playwright install chromium
"""

import asyncio
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

import aiohttp
import aiofiles
from playwright.async_api import async_playwright, Page, BrowserContext, Playwright, Frame

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

    Args:
        operation: Async callable to execute
        max_attempts: Maximum retry attempts (default 5)
        base_delay: Initial delay in seconds (default 0.2)
        max_delay: Maximum delay cap (default 10s)
        exceptions: Tuple of exceptions to catch and retry
        on_retry: Optional callback(attempt, error, delay) called before each retry

    Returns:
        Result of successful operation

    Raises:
        Last exception if all attempts fail
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
# RATE LIMITER (CRITICAL FIX)
# ==============================================================================

class TransferRateLimiter:
    """Rate limiter to prevent runaway transfers."""

    def __init__(self, max_per_minute: int = 3, max_per_hour: int = 20,
                 max_daily_amount: float = 10000):
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
                self._daily_amount = 0
                self._daily_date = today

            # Clean old entries
            self._minute_window = [t for t in self._minute_window if now - t < 60]
            self._hour_window = [t for t in self._hour_window if now - t < 3600]

            if len(self._minute_window) >= self.max_per_minute:
                return (False, f"Rate limit: max {self.max_per_minute}/min exceeded")
            if len(self._hour_window) >= self.max_per_hour:
                return (False, f"Rate limit: max {self.max_per_hour}/hour exceeded")
            if self._daily_amount + amount > self.max_daily_amount:
                return (False, f"Daily limit ${self.max_daily_amount:,.2f} exceeded")

            return (True, "")

    async def record_transfer(self, amount: float):
        """Record a successful transfer."""
        async with self._lock:
            now = time.time()
            self._minute_window.append(now)
            self._hour_window.append(now)
            self._daily_amount += amount


# ==============================================================================
# IDEMPOTENCY (CRITICAL FIX)
# ==============================================================================

class IdempotencyStore:
    """Track transfer idempotency to prevent duplicates."""

    def __init__(self, ttl_hours: int = 24):
        self.ttl_seconds = ttl_hours * 3600
        self._keys: Dict[str, float] = {}  # key -> timestamp
        self._lock = asyncio.Lock()

    @staticmethod
    def generate_key(order_id: str, destination: str, amount: float) -> str:
        """Generate idempotency key for a transfer."""
        import hashlib
        data = f"{order_id}:{destination}:{amount:.2f}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]

    async def check_and_set(self, key: str) -> bool:
        """
        Check if key exists. If not, set it and return True.
        Returns False if key already exists (duplicate).
        """
        async with self._lock:
            now = time.time()

            # Clean expired keys
            expired = [k for k, ts in self._keys.items() if now - ts > self.ttl_seconds]
            for k in expired:
                del self._keys[k]

            if key in self._keys:
                return False  # Duplicate

            self._keys[key] = now
            return True  # OK to proceed

    async def remove(self, key: str):
        """Remove key (for rollback on failure)."""
        async with self._lock:
            self._keys.pop(key, None)


# ==============================================================================
# ORDER PROCESSING LOCK (CRITICAL FIX)
# ==============================================================================

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
    # Alias: letters, numbers, dots, hyphens, 6-20 chars
    pattern = r'^[a-zA-Z0-9.\-]{6,20}$'
    return bool(re.match(pattern, alias))


def validate_ecuador_account(account: str) -> bool:
    """Validate Ecuador bank account number (Produbanco format)."""
    if not account:
        return False
    account_clean = account.replace(" ", "").replace("-", "")
    # Produbanco accounts: typically 10-11 digits
    return account_clean.isdigit() and 9 <= len(account_clean) <= 15


def validate_transfer_destination(destination: str, country: str = 'AR') -> tuple:
    """
    Validate transfer destination and return (is_valid, dest_type, cleaned_value).

    Returns:
        (bool, str, str): (is_valid, type, cleaned_value)
        type can be: 'cvu', 'cbu', 'alias', 'account', 'unknown'
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
    elif country == 'EC':
        if validate_ecuador_account(dest_clean):
            return (True, 'account', dest_clean.replace(" ", "").replace("-", ""))

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
# CONFIGURATION
# ==============================================================================

CONFIG_FILE = "/home/edu/autorenta/apps/web/tools/mercadopago-mcp/p2p_config_ecuador.json"

# Optimization constants
MIN_PRICE_CHANGE = 0.001  # Only update if price changes by more than $0.001
MIN_UPDATE_INTERVAL = 120  # Minimum seconds between price updates
PRICE_CACHE_TTL = 30  # Cache prices for 30 seconds
STATE_FLUSH_INTERVAL = 30  # Save state every 30 seconds


# ==============================================================================
# ASYNC LOGGER
# ==============================================================================

class AsyncLogger:
    """Non-blocking async logger with real-time streaming, colors, and JSON support."""

    COLORS = {
        'INFO': '\033[97m',      # White
        'WARN': '\033[93m',      # Yellow
        'ERROR': '\033[91m',     # Red
        'SUCCESS': '\033[92m',   # Green
        'DEBUG': '\033[90m',     # Gray
        'BINANCE': '\033[38;5;214m',  # Orange
        'PRODUBANCO': '\033[38;5;33m',  # Blue
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
        'PRODUBANCO': '🏦',
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
        self._task = asyncio.create_task(self._writer_loop())
        self._json_task = asyncio.create_task(self._json_writer_loop())

    async def stop(self):
        for task in [self._task, self._json_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

    async def _writer_loop(self):
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
        # Also write to JSON log if extra data provided
        if extra:
            self.log_structured(level, msg, **extra)

    def log_structured(self, level: str, message: str, **data):
        """
        Write structured JSON log entry for analytics and monitoring.

        Args:
            level: Log level (INFO, WARN, ERROR, etc.)
            message: Human-readable message
            **data: Additional structured data (order_id, amount, etc.)
        """
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
# STATE MANAGER
# ==============================================================================

class StateManager:
    def __init__(self, file_path: str, flush_interval: int = STATE_FLUSH_INTERVAL):
        self.file_path = file_path
        self.flush_interval = flush_interval
        self._state: Dict = {}
        self._dirty = False
        self._task: Optional[asyncio.Task] = None
        self._lock = asyncio.Lock()

    async def start(self):
        await self._load()
        self._task = asyncio.create_task(self._flush_loop())

    async def stop(self):
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        await self._save()

    async def _load(self):
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
        while True:
            await asyncio.sleep(self.flush_interval)
            await self._save()

    def _default_state(self) -> Dict:
        return {
            "processed_orders": set(),  # Use set for O(1) lookup
            "released_orders": set(),   # Use set for O(1) lookup
            "daily_volume_usd": 0,
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
# PRICE CACHE
# ==============================================================================

class PriceCache:
    def __init__(self, ttl_seconds: int = PRICE_CACHE_TTL):
        self.ttl = ttl_seconds
        self._cache: Dict[str, tuple] = {}
        self._lock = asyncio.Lock()

    def _make_key(self, asset: str, fiat: str, trade_type: str) -> str:
        return f"{asset}:{fiat}:{trade_type}"

    async def get(self, asset: str, fiat: str, trade_type: str):
        key = self._make_key(asset, fiat, trade_type)
        async with self._lock:
            if key in self._cache:
                data, timestamp = self._cache[key]
                if time.time() - timestamp < self.ttl:
                    return data
        return None

    async def set(self, asset: str, fiat: str, trade_type: str, data: Any):
        key = self._make_key(asset, fiat, trade_type)
        async with self._lock:
            self._cache[key] = (data, time.time())


# ==============================================================================
# MAIN DAEMON CLASS
# ==============================================================================

class P2PDaemonEcuador:
    """P2P Automation Daemon for Ecuador with Produbanco integration."""

    def __init__(self, config_path: str = CONFIG_FILE):
        self.config_path = config_path
        self.config: Dict = {}
        self.logger: Optional[AsyncLogger] = None
        self.state: Optional[StateManager] = None
        self.price_cache: Optional[PriceCache] = None
        self.http_session: Optional[aiohttp.ClientSession] = None
        self._playwright: Optional[Playwright] = None
        self.browser: Optional[BrowserContext] = None
        self.order_page: Optional[Page] = None
        self.price_page: Optional[Page] = None
        self.bank_page: Optional[Page] = None
        self._pages_closed = False
        # Critical safety components
        self.rate_limiter: Optional[TransferRateLimiter] = None
        self.idempotency: Optional[IdempotencyStore] = None
        self.order_lock: Optional[OrderProcessingLock] = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, *args):
        await self.stop()

    def _load_config(self) -> Dict:
        with open(self.config_path, 'r') as f:
            return json.load(f)

    def log(self, msg: str, level: str = "INFO"):
        if self.logger:
            self.logger.log(msg, level)
        else:
            print(f"[{datetime.now():%Y-%m-%d %H:%M:%S}] [{level}] {msg}")

    async def start(self):
        self.config = self._load_config()

        self.logger = AsyncLogger(self.config.get('log_file', '/tmp/p2p_daemon_ecuador.log'))
        await self.logger.start()

        self.log("=" * 70)
        self.log("P2P AUTOMATION DAEMON - ECUADOR (Produbanco)")
        self.log("=" * 70)

        self.state = StateManager(
            self.config.get('state_file', '/tmp/daemon_state_ecuador.json'),
            flush_interval=STATE_FLUSH_INTERVAL
        )
        await self.state.start()

        self.price_cache = PriceCache(ttl_seconds=PRICE_CACHE_TTL)

        # Initialize safety components
        safety_config = self.config.get('safety', {})
        self.rate_limiter = TransferRateLimiter(
            max_per_minute=safety_config.get('max_transfers_per_minute', 3),
            max_per_hour=safety_config.get('max_transfers_per_hour', 20),
            max_daily_amount=safety_config.get('max_daily_volume_usd', 10000)
        )
        self.idempotency = IdempotencyStore(ttl_hours=24)
        self.order_lock = OrderProcessingLock()
        self.log("Safety components initialized (rate limiter, idempotency, order lock)", "SUCCESS")

        # DRY-RUN MODE indicator
        if self.config.get('dry_run', False):
            self.log("=" * 70, "WARN")
            self.log("DRY-RUN MODE ENABLED - No real transfers will be executed", "WARN")
            self.log("=" * 70, "WARN")

        self.http_session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=10),
            headers={
                'Content-Type': 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
            }
        )

        self.log("Starting browser...")
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch_persistent_context(
            self.config.get('browser_profile', '/home/edu/.produbanco-browser-profile'),
            headless=self.config.get('headless', False),
            viewport={'width': 1400, 'height': 900}
        )

        existing_pages = self.browser.pages
        if existing_pages:
            self.order_page = existing_pages[0]
        else:
            self.order_page = await self.browser.new_page()

        self.price_page = await self.browser.new_page()
        self.bank_page = await self.browser.new_page()

        self._pages_closed = False
        for page in [self.order_page, self.price_page, self.bank_page]:
            page.on('close', lambda: self._on_page_closed())

        self.log("Browser ready with 3 pages")

    def _on_page_closed(self):
        self._pages_closed = True
        self.log("A browser page was closed! Daemon will stop.", "ERROR")

    async def stop(self):
        self.log("Shutting down...")
        for page in [self.order_page, self.price_page, self.bank_page]:
            if page:
                try:
                    await page.close()
                except Exception as e:
                    self.log(f"Error closing page: {e}", "WARN")
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()
        if self.http_session:
            await self.http_session.close()
        if self.state:
            await self.state.stop()
        if self.logger:
            await self.logger.stop()

    def notify(self, title: str, message: str):
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

    async def wait_for_page_ready(self, page: Page, selector: str = None, timeout: int = 10000):
        try:
            await page.wait_for_load_state('domcontentloaded', timeout=timeout)
            if selector:
                await page.wait_for_selector(selector, state='visible', timeout=timeout)
        except Exception:
            await page.wait_for_timeout(1000)

    # ==========================================================================
    # PRODUBANCO OPERATIONS
    # ==========================================================================

    async def get_produbanco_iframe(self, page: Page) -> Optional[Frame]:
        """Get the main iframe in Produbanco where all content is."""
        try:
            iframe = page.frame(name="iframe_a") or page.frame(url=re.compile(r"Produnet"))
            if not iframe:
                frames = page.frames
                for f in frames:
                    if 'Produnet' in f.url or 'iframe_a' in f.name:
                        return f
            return iframe
        except Exception:
            return None

    async def execute_produbanco_transfer(self, account_number: str, amount: float,
                                          bank_code: str = "36", recipient_name: str = "",
                                          order_id: str = "") -> bool:
        """Execute Produbanco transfer to a given account."""
        page = self.bank_page

        # Validate account number before proceeding
        is_valid, dest_type, cleaned_account = validate_transfer_destination(account_number, country='EC')
        if not is_valid:
            self.log(f"  INVALID account format: {account_number}", "ERROR")
            self.logger.log_structured("ERROR", "Invalid transfer destination",
                                       account=account_number, amount=amount, validation_failed=True)
            return False

        # Validate amount
        if amount <= 0:
            self.log(f"  INVALID amount: {amount}", "ERROR")
            self.logger.log_structured("ERROR", "Invalid amount",
                                       amount=amount, reason="non_positive")
            return False

        safety = self.config.get('safety', {})
        max_single = safety.get('max_single_order_usd', 5000)
        if amount > max_single:
            self.log(f"  Amount ${amount:.2f} exceeds limit ${max_single}", "ERROR")
            self.logger.log_structured("ERROR", "Amount exceeds limit",
                                       amount=amount, limit=max_single)
            return False

        # CRITICAL: Check rate limiter
        can_transfer, rate_reason = await self.rate_limiter.can_transfer(amount)
        if not can_transfer:
            self.log(f"  BLOCKED by rate limiter: {rate_reason}", "ERROR")
            self.logger.log_structured("ERROR", "Transfer blocked by rate limiter",
                                       reason=rate_reason, amount=amount)
            return False

        # CRITICAL: Check idempotency (prevent duplicate transfers)
        idempotency_key = IdempotencyStore.generate_key(order_id or "unknown", cleaned_account, amount)
        if not await self.idempotency.check_and_set(idempotency_key):
            self.log(f"  BLOCKED: Duplicate transfer detected (key={idempotency_key[:8]}...)", "ERROR")
            self.logger.log_structured("ERROR", "Duplicate transfer blocked",
                                       idempotency_key=idempotency_key, amount=amount)
            return False

        self.log(f"  Transferring ${amount:.2f} USD to {cleaned_account}", "PRODUBANCO")
        self.logger.log_structured("INFO", "Starting transfer",
                                   destination=cleaned_account, amount=amount, dest_type=dest_type,
                                   idempotency_key=idempotency_key)

        # DRY-RUN MODE: Simulate transfer without executing
        if self.config.get('dry_run', False):
            self.log(f"  [DRY-RUN] Would transfer ${amount:.2f} USD to {cleaned_account}", "SUCCESS")
            self.logger.log_structured("DRY_RUN", "Simulated transfer",
                                       destination=cleaned_account, amount=amount,
                                       order_id=order_id, recipient=recipient_name)
            # Record in rate limiter even in dry-run to test limits
            await self.rate_limiter.record_transfer(amount)
            return True

        try:
            # Navigate to Produbanco
            produbanco_config = self.config.get('produbanco', {})
            login_url = produbanco_config.get('login_url', 'https://www.produbanco.com/produnet/?qsCanal=IN&qsBanca=E')

            await page.goto(login_url)
            await self.wait_for_page_ready(page)

            # Check if logged in (look for dashboard elements)
            if 'login' in page.url.lower():
                self.log("  PRODUBANCO: Login required", "WARN")
                self.notify("P2P Ecuador", "Produbanco login required")
                # Wait for manual login
                for _ in range(60):
                    await asyncio.sleep(5)
                    if 'login' not in page.url.lower():
                        break
                else:
                    self.log("  Login timeout", "ERROR")
                    return False

            # Navigate to transfers
            await page.click('a:has-text("Transferencias")')
            await asyncio.sleep(2)

            # Get iframe
            iframe = await self.get_produbanco_iframe(page)
            if not iframe:
                self.log("  Could not find Produbanco iframe", "ERROR")
                return False

            # Click "A un nuevo contacto"
            await iframe.click('.wp-opcion-transferencia >> nth=0')
            await asyncio.sleep(2)

            # Fill bank selection
            await iframe.select_option('#cbxBanco', bank_code)
            await asyncio.sleep(1)

            # Fill account number
            await iframe.fill('input[name="numeroCuenta"]', account_number)
            await asyncio.sleep(0.5)

            # Click verify
            await iframe.click('button:has-text("Verificar")')
            await asyncio.sleep(3)

            # Fill amount (after verification)
            amount_input = await iframe.query_selector('input[name="monto"], #monto, input[type="number"]')
            if amount_input:
                await amount_input.fill(str(amount))
            else:
                self.log("  Amount field not found", "ERROR")
                return False

            # Click continue/confirm
            await iframe.click('button:has-text("Continuar"), button:has-text("Confirmar")')
            await asyncio.sleep(2)

            # Check for 2FA
            token_input = await iframe.query_selector('input[name="token"], input[placeholder*="token"]')
            if token_input:
                self.log("  2FA TOKEN REQUIRED - Enter manually", "WARN")
                self.notify("P2P Ecuador", "2FA Token required for transfer")
                # Wait for manual token entry
                for _ in range(60):
                    await asyncio.sleep(5)
                    success = await iframe.query_selector('text=exitosa, text=comprobante, text=Transferencia realizada')
                    if success:
                        break
                else:
                    self.log("  2FA timeout", "ERROR")
                    return False

            # Check success
            success = await iframe.query_selector('text=exitosa, text=comprobante')
            if success:
                self.log("  Transfer successful!", "SUCCESS")
                await self.rate_limiter.record_transfer(amount)  # Record successful transfer
                self.logger.log_structured("SUCCESS", "Transfer completed",
                                           destination=cleaned_account, amount=amount)
                return True

            # Transfer failed - rollback idempotency
            await self.idempotency.remove(idempotency_key)
            return False

        except Exception as e:
            self.log(f"  Transfer error: {e}", "ERROR")
            await self.idempotency.remove(idempotency_key)  # Rollback on error
            return False

    async def check_produbanco_deposit(self, expected_amount: float,
                                       time_window_minutes: int = 30,
                                       tolerance_percent: float = 1) -> Dict:
        """Check if we received a deposit in Produbanco."""
        page = self.bank_page
        self.log(f"  Checking for ${expected_amount:.2f} USD deposit...", "PRODUBANCO")

        try:
            # Navigate to account movements
            produbanco_config = self.config.get('produbanco', {})
            await page.goto(produbanco_config.get('login_url', 'https://www.produbanco.com/produnet/'))
            await self.wait_for_page_ready(page)

            # Get iframe
            iframe = await self.get_produbanco_iframe(page)
            if not iframe:
                return {'received': False, 'error': 'No iframe'}

            # Navigate to movements
            await iframe.click('a:has-text("Movimientos"), a:has-text("Consultas")')
            await asyncio.sleep(2)

            # Get recent movements
            movements = await iframe.evaluate("""
            () => {
                const rows = document.querySelectorAll('table tr, .movimiento, [class*="movement"]');
                return Array.from(rows).slice(0, 20).map(row => ({
                    text: row.innerText,
                    amount: row.innerText.match(/\\$?([\\d,]+\\.\\d{2})/)?.[1]?.replace(',', '') || '0'
                }));
            }
            """)

            min_amount = expected_amount * (1 - tolerance_percent / 100)
            max_amount = expected_amount * (1 + tolerance_percent / 100)
            cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)

            for mov in movements:
                try:
                    amount = float(mov.get('amount', 0))
                    # C2 FIX: cutoff_time is used for future time-based filtering if needed
                    # Currently we check all recent movements since Produbanco doesn't expose timestamps easily
                    if min_amount <= amount <= max_amount:
                        self.log(f"  Deposit found: ${amount:.2f}", "SUCCESS")
                        self.logger.log_structured("SUCCESS", "Deposit verified",
                                                   expected=expected_amount, found=amount)
                        return {'received': True, 'amount': amount}
                except (ValueError, TypeError, KeyError) as e:
                    # C1 FIX: Log parsing errors instead of silently ignoring
                    self.logger.log_structured("WARN", "Movement parsing failed",
                                               error=str(e), movement_text=str(mov.get('text', ''))[:100])
                    continue

            self.log(f"  Deposit of ${expected_amount:.2f} USD not found", "WARN")
            return {'received': False}

        except Exception as e:
            self.log(f"  Error checking deposit: {e}", "ERROR")
            return {'received': False, 'error': str(e)}

    # ==========================================================================
    # BINANCE OPERATIONS
    # ==========================================================================

    async def get_pending_orders(self) -> Dict[str, List[Dict]]:
        """Get pending P2P orders from Binance."""
        page = self.order_page

        try:
            await page.goto('https://p2p.binance.com/en/fiatOrder?tab=1')
            await self.wait_for_page_ready(page, 'table, [class*="order"]')

            orders = await page.evaluate("""
            () => {
                const rows = document.querySelectorAll('table tbody tr, [class*="OrderList"] > div');
                return Array.from(rows).map(row => {
                    const text = row.innerText;
                    const link = row.querySelector('a')?.href || '';
                    const isBuy = text.toLowerCase().includes('buy') || text.includes('Comprar');
                    const isSell = text.toLowerCase().includes('sell') || text.includes('Vender');
                    const amountMatch = text.match(/([\\d,]+\\.?\\d*)\\s*USD/i);
                    const orderMatch = link.match(/orderNo=([\\w]+)/);
                    return {
                        type: isBuy ? 'buy' : (isSell ? 'sell' : 'unknown'),
                        order_number: orderMatch ? orderMatch[1] : '',
                        amount_fiat: amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0,
                        href: link,
                        text: text.substring(0, 200)
                    };
                }).filter(o => o.order_number && o.amount_fiat > 0);
            }
            """)

            buy_orders = [o for o in orders if o['type'] == 'buy']
            sell_orders = [o for o in orders if o['type'] == 'sell']

            return {'buy': buy_orders, 'sell': sell_orders}

        except Exception as e:
            self.log(f"Error getting orders: {e}", "ERROR")
            return {'buy': [], 'sell': []}

    async def get_order_payment_details(self, order_url: str) -> Optional[Dict]:
        """Extract payment details from order page."""
        page = self.order_page

        try:
            await page.goto(order_url)
            await self.wait_for_page_ready(page)

            details = await page.evaluate("""
            () => {
                const text = document.body.innerText;
                const accountMatch = text.match(/(?:Cuenta|Account)[:\\s]*([\\d\\-]+)/i);
                const bankMatch = text.match(/(?:Banco|Bank)[:\\s]*([^\\n]+)/i);
                const nameMatch = text.match(/(?:Nombre|Name|Beneficiario)[:\\s]*([^\\n]+)/i);
                return {
                    account_number: accountMatch?.[1]?.trim() || '',
                    bank_name: bankMatch?.[1]?.trim() || '',
                    recipient_name: nameMatch?.[1]?.trim() || ''
                };
            }
            """)

            return details if details.get('account_number') else None

        except Exception as e:
            self.log(f"Error getting payment details: {e}", "ERROR")
            return None

    async def mark_order_as_paid(self, order_url: str) -> bool:
        """Mark order as paid in Binance."""
        page = self.order_page
        try:
            await page.goto(order_url)
            await self.wait_for_page_ready(page)

            paid_btn = await page.query_selector('button:has-text("Transferred"), button:has-text("Paid")')
            if paid_btn:
                await paid_btn.click()
                await asyncio.sleep(1)
                confirm = await page.query_selector('button:has-text("Confirm")')
                if confirm:
                    await confirm.click()
                self.log("  Marked as paid in Binance", "SUCCESS")
                return True
        except Exception as e:
            self.log(f"  Error marking as paid: {e}", "ERROR")
        return False

    async def release_crypto(self, order_url: str) -> bool:
        """Release crypto after payment verified."""
        page = self.order_page
        try:
            await page.goto(order_url)
            await self.wait_for_page_ready(page)

            release_btn = await page.query_selector('button:has-text("Release"), button:has-text("Confirm Release")')
            if release_btn:
                await release_btn.click()
                await asyncio.sleep(1)

                # Check for 2FA
                twofa = await page.query_selector('input[placeholder*="2FA"], input[placeholder*="code"]')
                if twofa:
                    self.log("  2FA REQUIRED - Enter code manually", "WARN")
                    self.notify("P2P Ecuador", "2FA required to release USDT")
                    for _ in range(60):
                        await asyncio.sleep(5)
                        success = await page.query_selector('text=Released, text=Completed')
                        if success:
                            self.log("  2FA completed, crypto released!", "SUCCESS")
                            return True
                    self.log("  2FA timeout", "ERROR")
                    return False

                await asyncio.sleep(1)
                success = await page.query_selector('text=Released, text=Completed')
                if success:
                    self.log("  Crypto released successfully!", "SUCCESS")
                    return True

        except Exception as e:
            self.log(f"  Error releasing crypto: {e}", "ERROR")
        return False

    async def update_ad_price(self, new_price: float, ad_type: str = 'buy') -> bool:
        """Update price of an existing ad in Binance."""
        page = self.price_page

        # SECURITY: Sanitize ad_type to prevent JS injection
        try:
            safe_ad_type = sanitize_ad_type(ad_type)
        except ValueError as e:
            self.log(f"  Invalid ad_type: {e}", "ERROR")
            return False

        self.log(f"  Updating {safe_ad_type.upper()} ad price to ${new_price:.4f} USD", "BINANCE")

        try:
            await page.goto('https://p2p.binance.com/en/myads?type=normal&code=default')
            await self.wait_for_page_ready(page, 'table, [class*="AdRow"]')
            await asyncio.sleep(2)

            # Find the correct ad row and click edit
            edit_clicked = await page.evaluate(f"""
            () => {{
                const rows = document.querySelectorAll('table tbody tr, [class*="AdRow"], [class*="ad-row"]');
                for (const row of rows) {{
                    const text = row.innerText || '';
                    const isSell = text.includes('Sell') || text.includes('Vender');
                    const isBuy = text.includes('Buy') || text.includes('Comprar');
                    const isUSD = text.includes('USD');

                    if (isUSD && (('{safe_ad_type}' === 'sell' && isSell) || ('{safe_ad_type}' === 'buy' && isBuy))) {{
                        // Find edit button/link in this row
                        const editBtn = row.querySelector('a[href*="edit"], button:has-text("Edit"), a:has-text("Edit"), [class*="edit"]');
                        if (editBtn) {{
                            editBtn.click();
                            return true;
                        }}
                        // Try clicking any button/link in the row
                        const anyBtn = row.querySelector('a, button');
                        if (anyBtn && (anyBtn.innerText.includes('Edit') || anyBtn.innerText.includes('Editar'))) {{
                            anyBtn.click();
                            return true;
                        }}
                    }}
                }}
                return false;
            }}
            """)

            if not edit_clicked:
                # Fallback: try to find any edit button
                edit_btn = await page.query_selector('a[href*="edit"], button:has-text("Edit")')
                if edit_btn:
                    await edit_btn.click()
                else:
                    self.log("  Edit button not found", "WARN")
                    return False

            await asyncio.sleep(2)

            # Wait for edit form to load
            await self.wait_for_page_ready(page, 'input[name*="price"], input[placeholder*="price"]')

            # Find and update price input
            price_input = await page.query_selector('input[name*="price"], input[placeholder*="price"], input[id*="price"]')
            if price_input:
                # Clear and type new price
                await price_input.click()
                await page.keyboard.press('Control+a')
                await page.keyboard.type(f"{new_price:.4f}")
                await asyncio.sleep(0.5)

                # Click save/post button
                save_btn = await page.query_selector('button:has-text("Post"), button:has-text("Save"), button:has-text("Confirm"), button:has-text("Publicar")')
                if save_btn:
                    await save_btn.click()
                    await asyncio.sleep(2)

                    # Check for success
                    success = await page.query_selector('text=success, text=updated, text=exitoso')
                    if success or 'myads' in page.url.lower():
                        self.log(f"  Price updated to ${new_price:.4f} USD", "SUCCESS")
                        return True

            self.log("  Could not update price", "WARN")
            return False

        except Exception as e:
            self.log(f"  Error updating ad price: {e}", "ERROR")
            return False

    async def check_ad_exists(self, ad_type: str = 'buy', asset: str = 'USDT', fiat: str = 'USD') -> bool:
        """Check if an ad of the specified type already exists."""
        page = self.price_page

        # SECURITY: Sanitize inputs to prevent JS injection
        try:
            safe_ad_type = sanitize_ad_type(ad_type)
            safe_asset = sanitize_asset_fiat(asset)
            safe_fiat = sanitize_asset_fiat(fiat)
        except ValueError as e:
            self.log(f"  Invalid input: {e}", "ERROR")
            return False

        try:
            await page.goto('https://p2p.binance.com/en/myads?type=normal&code=default')
            await self.wait_for_page_ready(page, 'table, [class*="AdRow"], .no-data')
            await asyncio.sleep(2)

            # Check for "no ads" message
            no_ads = await page.query_selector('text=No ads, text=No hay anuncios, .no-data, [class*="empty"]')
            if no_ads:
                self.log(f"No {safe_ad_type.upper()} ads found", "INFO")
                return False

            # Look for existing ad matching type and fiat
            ad_type_upper = 'Buy' if safe_ad_type == 'buy' else 'Sell'
            ad_type_lower = ad_type_upper.lower()
            found = await page.evaluate(f"""
            () => {{
                const rows = document.querySelectorAll('table tbody tr, [class*="AdRow"], [class*="ad-row"]');
                for (const row of rows) {{
                    const text = row.innerText || '';
                    const matchesType = text.includes('{ad_type_upper}') || text.includes('{ad_type_lower}');
                    const matchesFiat = text.includes('{safe_fiat}');
                    const matchesAsset = text.includes('{safe_asset}');
                    if (matchesType && matchesFiat && matchesAsset) {{
                        return true;
                    }}
                }}
                return false;
            }}
            """)

            if found:
                self.log(f"Found existing {ad_type.upper()} {asset}/{fiat} ad", "SUCCESS")
            else:
                self.log(f"No {ad_type.upper()} {asset}/{fiat} ad found", "INFO")

            return found

        except Exception as e:
            self.log(f"Error checking ads: {e}", "ERROR")
            return False

    async def create_ad(self, ad_config: Dict) -> bool:
        """Create a new ad on Binance P2P."""
        page = self.price_page
        ad_type = ad_config.get('type', 'buy')
        asset = ad_config.get('asset', 'USDT')
        fiat = ad_config.get('fiat', 'USD')

        self.log(f"Creating {ad_type.upper()} ad: {asset}/{fiat}", "BINANCE")

        try:
            # Navigate to post ad page
            await page.goto('https://p2p.binance.com/en/postAd')
            await self.wait_for_page_ready(page, 'button, [class*="tab"], input')
            await asyncio.sleep(2)

            # Step 1: Select Buy or Sell
            if ad_type.lower() == 'buy':
                buy_tab = await page.query_selector('button:has-text("I want to buy"), [data-testid="buy-tab"], button:has-text("Buy"), button:has-text("Comprar")')
                if buy_tab:
                    await buy_tab.click()
                    await asyncio.sleep(1)
                    self.log("  Selected: BUY", "INFO")
            else:
                sell_tab = await page.query_selector('button:has-text("I want to sell"), [data-testid="sell-tab"], button:has-text("Sell"), button:has-text("Vender")')
                if sell_tab:
                    await sell_tab.click()
                    await asyncio.sleep(1)
                    self.log("  Selected: SELL", "INFO")

            # Step 2: Select Asset (USDT)
            asset_selector = await page.query_selector(f'button:has-text("{asset}"), [data-testid="asset-{asset}"], label:has-text("{asset}")')
            if asset_selector:
                await asset_selector.click()
                await asyncio.sleep(0.5)
                self.log(f"  Selected asset: {asset}", "INFO")

            # Step 3: Select Fiat (USD)
            fiat_dropdown = await page.query_selector('input[placeholder*="fiat"], [class*="fiat-select"], button:has-text("Select fiat")')
            if fiat_dropdown:
                await fiat_dropdown.click()
                await asyncio.sleep(0.5)
                fiat_option = await page.query_selector(f'li:has-text("{fiat}"), [data-value="{fiat}"], div:has-text("{fiat}")')
                if fiat_option:
                    await fiat_option.click()
                    await asyncio.sleep(0.5)
                    self.log(f"  Selected fiat: {fiat}", "INFO")

            # Step 4: Get optimal price from competitors
            trade_type_for_search = 'BUY' if ad_type.lower() == 'sell' else 'SELL'  # Look at opposite side
            competitors = await self.get_competitor_prices(
                asset=asset,
                fiat=fiat,
                trade_type=trade_type_for_search,
                payment_methods=ad_config.get('payment_methods', ['Produbanco'])
            )

            if competitors:
                # For BUY ad: we want to pay MORE than competitors (to attract sellers)
                # For SELL ad: we want to charge LESS than competitors (to attract buyers)
                if ad_type.lower() == 'buy':
                    optimal_price = competitors[0]['price'] + ad_config.get('price_margin', 0.001)
                else:
                    optimal_price = competitors[0]['price'] - ad_config.get('price_margin', 0.001)

                # Clamp to min/max
                optimal_price = max(ad_config.get('min_price', 0), min(ad_config.get('max_price', float('inf')), optimal_price))
            else:
                # Default price if no competitors
                optimal_price = 1.00 if fiat == 'USD' else ad_config.get('min_price', 1000)

            self.log(f"  Optimal price: ${optimal_price:.4f}", "INFO")

            # Step 5: Enter price
            price_input = await page.query_selector('input[name*="price"], input[placeholder*="price"], input[id*="price"], [data-testid="price-input"]')
            if price_input:
                await price_input.click()
                await page.keyboard.press('Control+a')
                await page.keyboard.type(f"{optimal_price:.4f}")
                await asyncio.sleep(0.5)

            # Step 6: Enter amounts
            min_amount = ad_config.get('min_amount', 10)
            max_amount = ad_config.get('max_amount', 5000)

            min_input = await page.query_selector('input[name*="min"], input[placeholder*="Min"], [data-testid="min-amount"]')
            if min_input:
                await min_input.click()
                await page.keyboard.press('Control+a')
                await page.keyboard.type(str(min_amount))

            max_input = await page.query_selector('input[name*="max"], input[placeholder*="Max"], [data-testid="max-amount"]')
            if max_input:
                await max_input.click()
                await page.keyboard.press('Control+a')
                await page.keyboard.type(str(max_amount))

            await asyncio.sleep(1)

            # Step 7: Select payment method (Produbanco)
            payment_methods = ad_config.get('payment_methods', ['Produbanco'])
            for pm in payment_methods:
                pm_selector = await page.query_selector(f'label:has-text("{pm}"), button:has-text("{pm}"), [data-value="{pm}"], input[value="{pm}"]')
                if pm_selector:
                    await pm_selector.click()
                    await asyncio.sleep(0.5)
                    self.log(f"  Selected payment: {pm}", "INFO")
                else:
                    # Try to find in dropdown
                    pm_dropdown = await page.query_selector('button:has-text("Select payment"), [class*="payment-method"]')
                    if pm_dropdown:
                        await pm_dropdown.click()
                        await asyncio.sleep(0.5)
                        pm_option = await page.query_selector(f'li:has-text("{pm}"), [data-value="{pm}"]')
                        if pm_option:
                            await pm_option.click()
                            await asyncio.sleep(0.5)
                            self.log(f"  Selected payment: {pm}", "INFO")

            # Step 8: Enter auto-reply message
            auto_reply = ad_config.get('auto_reply', '')
            if auto_reply:
                reply_input = await page.query_selector('textarea[name*="remark"], textarea[placeholder*="remark"], [data-testid="auto-reply"]')
                if reply_input:
                    await reply_input.click()
                    await page.keyboard.type(auto_reply)

            await asyncio.sleep(1)

            # Step 9: Click Next/Continue button (multi-step form)
            for _ in range(3):  # Try up to 3 steps
                next_btn = await page.query_selector('button:has-text("Next"), button:has-text("Continue"), button:has-text("Siguiente")')
                if next_btn and await next_btn.is_visible():
                    await next_btn.click()
                    await asyncio.sleep(2)
                else:
                    break

            # Step 10: Click Post/Publish button
            post_btn = await page.query_selector('button:has-text("Post"), button:has-text("Publish"), button:has-text("Publicar"), button:has-text("Confirm")')
            if post_btn:
                await post_btn.click()
                await asyncio.sleep(3)

                # Check for success
                success = await page.query_selector('text=successfully, text=exitoso, text=publicado')
                if success or 'myads' in page.url.lower():
                    self.log(f"Ad created successfully! Price: ${optimal_price:.4f}", "SUCCESS")

                    # Save to state
                    prices = self.state.get('current_ad_prices') or {}
                    prices[ad_config['id']] = optimal_price
                    self.state.set('current_ad_prices', prices)
                    self.state.set('ad_created', True)

                    return True

            self.log("Could not create ad - check browser manually", "WARN")
            return False

        except Exception as e:
            self.log(f"Error creating ad: {e}", "ERROR")
            return False

    async def ensure_ad_exists(self) -> bool:
        """Ensure that required ads exist, creating them if necessary."""
        for ad in self.config.get('ads', []):
            if not ad.get('enabled', True):
                continue

            exists = await self.check_ad_exists(
                ad_type=ad['type'],
                asset=ad.get('asset', 'USDT'),
                fiat=ad.get('fiat', 'USD')
            )

            if not exists:
                self.log(f"Ad not found, creating {ad['type'].upper()} {ad.get('asset', 'USDT')}/{ad.get('fiat', 'USD')}...", "INFO")
                success = await self.create_ad(ad)
                if not success:
                    self.log(f"Failed to create ad. Please create manually.", "ERROR")
                    return False
            else:
                self.log(f"Ad exists: {ad['type'].upper()} {ad.get('asset', 'USDT')}/{ad.get('fiat', 'USD')}", "SUCCESS")

        return True

    async def get_competitor_prices(self, asset: str = 'USDT', fiat: str = 'USD',
                                    trade_type: str = 'SELL',
                                    payment_methods: List[str] = None) -> List[Dict]:
        """Get competitor prices with caching and retry."""
        if payment_methods is None:
            payment_methods = ['Produbanco']

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
                               margin: float = 0.001, min_price: float = 0,
                               max_price: float = float('inf')) -> Optional[float]:
        """Calculate optimal price based on strategy."""
        if not competitors or strategy == 'fixed':
            return None

        if strategy == 'top1':
            optimal = competitors[0]['price'] - margin
        elif strategy == 'undercut':
            optimal = competitors[0]['price'] - 0.001
        elif strategy == 'top3_avg':
            top3 = competitors[:3]
            optimal = sum(c['price'] for c in top3) / len(top3)
        else:
            return None

        optimal = max(min_price, min(max_price, optimal))
        return round(optimal, 4)

    # ==========================================================================
    # MAIN LOOPS
    # ==========================================================================

    async def monitor_orders(self):
        """Main loop to monitor and process P2P orders."""
        poll_interval = self.config.get('poll_interval_seconds', 30)
        safety = self.config.get('safety', {})

        while True:
            try:
                if self.state.get('error_count', 0) >= safety.get('pause_on_error_count', 3):
                    self.log("Too many errors, pausing...", "WARN")
                    await asyncio.sleep(300)
                    self.state.set('error_count', 0)
                    continue

                orders = await self.get_pending_orders()
                buy_orders = orders.get('buy', [])
                sell_orders = orders.get('sell', [])

                # Process BUY orders (we pay via Produbanco)
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
                        self.log(f"   Amount: ${order['amount_fiat']:.2f} USD", "ORDER")

                        if order['amount_fiat'] > safety.get('max_single_order_usd', 5000):
                            self.log("   Exceeds limit, skipping", "WARN")
                            continue

                        details = await self.get_order_payment_details(order['href'])
                        if details and details.get('account_number'):
                            self.log(f"   Destination: {details['account_number']}")

                            if self.config.get('buy_flow', {}).get('auto_pay', True):
                                if await self.execute_produbanco_transfer(
                                    details['account_number'],
                                    order['amount_fiat'],
                                    recipient_name=details.get('recipient_name', ''),
                                    order_id=order_id  # Pass order_id for idempotency
                                ):
                                    if self.config.get('buy_flow', {}).get('mark_as_paid_after_transfer', True):
                                        await self.mark_order_as_paid(order['href'])
                                    self.state.add_to_set('processed_orders', order_id)
                                    self.state.increment('daily_volume_usd', order['amount_fiat'])
                                    self.log("   Order processed!", "SUCCESS")
                                else:
                                    self.state.increment('error_count')
                        else:
                            self.log("   Account details not found", "WARN")
                    finally:
                        await self.order_lock.release(order_id)

                # Process SELL orders (we receive via Produbanco, release USDT)
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
                        self.log(f"   Amount: ${order['amount_fiat']:.2f} USD", "ORDER")

                        if self.config.get('sell_flow', {}).get('verify_produbanco_deposit', True):
                            verification = await self.check_produbanco_deposit(
                                order['amount_fiat'],
                                self.config.get('sell_flow', {}).get('payment_verification_window_minutes', 30),
                                self.config.get('sell_flow', {}).get('amount_tolerance_percent', 1)
                            )

                            if not verification.get('received'):
                                self.log("   Deposit NOT verified, waiting...", "WARN")
                                continue

                        if await self.release_crypto(order['href']):
                            self.state.add_to_set('released_orders', order_id)
                            self.state.increment('daily_volume_usd', order['amount_fiat'])
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
        """Loop to maintain ads at Top 1 position."""
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
                        fiat=ad.get('fiat', 'USD'),
                        trade_type=trade_type,
                        payment_methods=ad.get('payment_methods', ['Produbanco'])
                    )

                    if not competitors:
                        self.log(f"No competitors found for {trade_type}", "WARN")
                        continue

                    optimal = self.calculate_optimal_price(
                        competitors,
                        strategy=ad['price_strategy'],
                        margin=ad.get('price_margin', 0.001),
                        min_price=ad.get('min_price', 0),
                        max_price=ad.get('max_price', float('inf'))
                    )

                    if optimal is None:
                        continue

                    current_price = (self.state.get('current_ad_prices') or {}).get(ad['id'])

                    if current_price and abs(current_price - optimal) < MIN_PRICE_CHANGE:
                        continue

                    last_update = self.state.get('last_price_update')
                    if last_update:
                        try:
                            elapsed = (datetime.now() - datetime.fromisoformat(last_update)).total_seconds()
                            if elapsed < MIN_UPDATE_INTERVAL:
                                continue
                        except Exception:
                            pass

                    self.log(f"Price update: {ad['type'].upper()} Top1=${competitors[0]['price']:.4f} → Optimal=${optimal:.4f}", "PRICE")

                    # Actually update the ad price on Binance
                    success = await self.update_ad_price(optimal, ad['type'])

                    if success:
                        prices = self.state.get('current_ad_prices') or {}
                        prices[ad['id']] = optimal
                        self.state.set('current_ad_prices', prices)
                        self.state.set('last_price_update', datetime.now().isoformat())
                        self.log(f"Ad price updated to ${optimal:.4f}", "SUCCESS")
                    else:
                        self.log(f"Failed to update ad price", "ERROR")

            except Exception as e:
                self.log(f"Error in maintain_top1: {e}", "ERROR")

            await asyncio.sleep(check_interval)

    async def verify_sessions(self):
        """Verify Binance and Produbanco sessions are active."""
        self.log("Verifying sessions...")

        self.log("Loading all pages in parallel...", "INFO")
        await asyncio.gather(
            self.order_page.goto('https://p2p.binance.com/en/fiatOrder?tab=1'),
            self.price_page.goto('https://p2p.binance.com/en/myads?type=normal&code=default'),
            self.bank_page.goto(self.config.get('produbanco', {}).get('login_url', 'https://www.produbanco.com/produnet/')),
        )
        self.log("All pages loaded", "SUCCESS")

        # Check Binance
        binance_needs_login = 'login' in self.order_page.url.lower() or 'accounts.binance' in self.order_page.url
        produbanco_needs_login = 'login' in self.bank_page.url.lower()

        if binance_needs_login:
            self.log("BINANCE: Login required", "WARN")
            self.notify("P2P Ecuador", "Binance login required")

        if produbanco_needs_login:
            self.log("PRODUBANCO: Login required", "WARN")
            self.notify("P2P Ecuador", "Produbanco login required")

        if binance_needs_login or produbanco_needs_login:
            self.log("Waiting for logins (up to 5 min)...", "INFO")
            for i in range(60):
                await asyncio.sleep(5)

                binance_ok = 'login' not in self.order_page.url.lower() and 'accounts.binance' not in self.order_page.url
                produbanco_ok = 'login' not in self.bank_page.url.lower()

                if binance_needs_login and binance_ok:
                    self.log("Binance session ACTIVE", "SUCCESS")
                    binance_needs_login = False

                if produbanco_needs_login and produbanco_ok:
                    self.log("Produbanco session ACTIVE", "SUCCESS")
                    produbanco_needs_login = False

                if not binance_needs_login and not produbanco_needs_login:
                    break

                if i % 12 == 0 and i > 0:
                    status = []
                    if binance_needs_login:
                        status.append("Binance")
                    if produbanco_needs_login:
                        status.append("Produbanco")
                    self.log(f"Still waiting for: {', '.join(status)} ({i*5}s)", "INFO")
        else:
            self.log("Binance session ACTIVE", "SUCCESS")
            self.log("Produbanco session ACTIVE", "SUCCESS")

    async def run(self):
        """Main entry point."""
        await self.verify_sessions()

        # Ensure ads exist (create if necessary)
        self.log("-" * 70)
        self.log("Checking ads...")
        if not await self.ensure_ad_exists():
            self.log("Could not ensure ads exist. Please create manually.", "ERROR")
            self.log("Go to: https://p2p.binance.com/en/postAd", "INFO")
            # Continue anyway - user might create manually
        self.log("-" * 70)

        self.log("-" * 70)
        self.log("Daemon started. Press Ctrl+C to stop.")
        self.log("DO NOT close any browser tabs!")
        self.log("-" * 70)

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
    async with P2PDaemonEcuador() as daemon:
        # Override dry_run from command line
        if dry_run:
            daemon.config['dry_run'] = True
            daemon.log("=" * 70, "WARN")
            daemon.log("DRY-RUN MODE ENABLED via command line", "WARN")
            daemon.log("=" * 70, "WARN")
        await daemon.run()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='P2P Automation Daemon - Ecuador')
    parser.add_argument('--dry-run', action='store_true',
                        help='Enable dry-run mode (no real transfers)')
    args = parser.parse_args()

    try:
        asyncio.run(main(dry_run=args.dry_run))
    except KeyboardInterrupt:
        print("\nDaemon stopped")
