#!/usr/bin/env python3
"""
P2P Automation Daemon v2
========================

Features:
- Monitor BUY orders → auto-pay via MercadoPago
- Monitor SELL orders → verify MP payment → auto-release USDT
- Competitor price tracking → auto-adjust to stay Top 1
- Ad management (create/edit/pause)

Usage:
    python p2p_daemon_v2.py

Requirements:
    pip install playwright aiohttp
    playwright install chromium
"""

import asyncio
import json
import os
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from playwright.async_api import async_playwright, Page, BrowserContext
import aiohttp

# ==============================================================================
# CONFIGURATION
# ==============================================================================

CONFIG_FILE = "/home/edu/autorenta/apps/web/tools/mercadopago-mcp/p2p_config.json"


def load_config() -> Dict:
    """Load configuration from JSON file."""
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)


def save_config(config: Dict):
    """Save configuration to JSON file."""
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)


# ==============================================================================
# LOGGING
# ==============================================================================

LOG_FILE = None


def log(msg: str, level: str = "INFO"):
    """Log message with timestamp."""
    global LOG_FILE
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {msg}"
    print(line)
    if LOG_FILE:
        with open(LOG_FILE, "a") as f:
            f.write(line + "\n")


# ==============================================================================
# STATE MANAGEMENT
# ==============================================================================

STATE_FILE = None


def load_state() -> Dict:
    """Load processed orders from state file."""
    global STATE_FILE
    if STATE_FILE and os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {
        "processed_orders": [],
        "released_orders": [],
        "daily_volume_ars": 0,
        "daily_volume_date": datetime.now().strftime("%Y-%m-%d"),
        "error_count": 0,
        "last_price_update": None,
        "current_ad_prices": {}
    }


def save_state(state: Dict):
    """Save state to file."""
    global STATE_FILE
    if STATE_FILE:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)


# ==============================================================================
# NOTIFICATIONS
# ==============================================================================

def notify(title: str, message: str, config: Dict):
    """Send notifications (sound + desktop)."""
    if config.get('notifications', {}).get('sound', True):
        os.system('paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null &')

    if config.get('notifications', {}).get('desktop', True):
        os.system(f'notify-send "{title}" "{message}" 2>/dev/null &')

    # TODO: Telegram notifications
    # if config.get('notifications', {}).get('telegram_bot_token'):
    #     send_telegram(config, title, message)


# ==============================================================================
# MODULE 1: MERCADOPAGO OPERATIONS
# ==============================================================================

async def set_amount_react(page: Page, amount: int) -> bool:
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
        await page.wait_for_timeout(100)
    return True


async def execute_mp_transfer(page: Page, alias_or_cvu: str, amount: int) -> bool:
    """Execute MercadoPago transfer (for BUY orders - we pay seller)."""
    log(f"  💸 Transfiriendo ${amount:,} ARS a {alias_or_cvu}")

    try:
        await page.goto('https://www.mercadopago.com.ar/home')
        await page.wait_for_timeout(2000)

        # Click Transferir
        await page.click('text=Transferir')
        await page.wait_for_timeout(1500)

        # Click CBU/CVU/alias
        await page.click('text=Con CBU, CVU o alias')
        await page.wait_for_timeout(1000)

        # Enter alias
        await page.fill('input', alias_or_cvu)
        await page.click('text=Continuar')

        # Wait for account confirmation
        try:
            await page.wait_for_selector('text=Confirmar cuenta', timeout=10000)
            await page.click('text=Confirmar cuenta')
        except:
            log("  ❌ Cuenta no encontrada", "ERROR")
            return False

        # Enter amount
        await page.wait_for_selector('#amount-field-input', timeout=10000)
        await set_amount_react(page, amount)
        await page.wait_for_timeout(300)

        # Continue and transfer
        await page.click('text=Continuar')
        await page.wait_for_selector('text=Revisá si está todo bien', timeout=10000)

        transfer_btn = await page.query_selector('button:has-text("Transferir")')
        if transfer_btn:
            await transfer_btn.click()

        await page.wait_for_timeout(2000)

        # Check for QR
        qr_visible = await page.query_selector('text=Escaneá el QR')
        if qr_visible:
            log("  📱 QR REQUERIDO - Escaneá con la app!", "WARN")
            notify("P2P Daemon", "QR requerido para transferencia", load_config())

            try:
                await page.wait_for_selector('text=Le transferiste', timeout=120000)
                log("  ✅ Transferencia exitosa!")
                return True
            except:
                log("  ⏱️ Timeout esperando QR", "ERROR")
                return False

        success = await page.query_selector('text=Le transferiste')
        if success:
            log("  ✅ Transferencia exitosa (sin QR)!")
            return True

        return False

    except Exception as e:
        log(f"  ❌ Error en transferencia: {e}", "ERROR")
        return False


async def check_mp_payment_received(page: Page, expected_amount: int,
                                     time_window_minutes: int = 30,
                                     tolerance_percent: float = 1) -> Dict:
    """
    Check if we received a payment in MercadoPago.
    Returns: {received: bool, amount: float, from_name: str, timestamp: str}
    """
    log(f"  🔍 Verificando pago de ${expected_amount:,} ARS en MP...")

    try:
        await page.goto('https://www.mercadopago.com.ar/activities')
        await page.wait_for_timeout(3000)

        # Calculate tolerance range
        min_amount = expected_amount * (1 - tolerance_percent / 100)
        max_amount = expected_amount * (1 + tolerance_percent / 100)
        cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)

        # Extract recent activities
        activities = await page.evaluate("""
        () => {
            const items = document.querySelectorAll('[data-testid="activity-row"], .activity-row, [class*="ActivityRow"]');
            return Array.from(items).slice(0, 20).map(item => {
                const text = item.innerText || '';
                const isIncoming = text.includes('Te transfirieron') ||
                                   text.includes('Recibiste') ||
                                   text.includes('cobro');

                // Extract amount
                const amountMatch = text.match(/\\$\\s*([\\d.,]+)/);
                const amount = amountMatch ?
                    parseFloat(amountMatch[1].replace(/\\./g, '').replace(',', '.')) : 0;

                // Extract name (usually first line)
                const lines = text.split('\\n').filter(l => l.trim());
                const fromName = lines[0] || '';

                return {
                    text: text.substring(0, 200),
                    is_incoming: isIncoming,
                    amount: amount,
                    from_name: fromName
                };
            });
        }
        """)

        # Find matching payment
        for activity in activities:
            if not activity['is_incoming']:
                continue

            if min_amount <= activity['amount'] <= max_amount:
                log(f"  ✅ Pago encontrado: ${activity['amount']:,.2f} de {activity['from_name']}")
                return {
                    'received': True,
                    'amount': activity['amount'],
                    'from_name': activity['from_name'],
                    'timestamp': datetime.now().isoformat()
                }

        log(f"  ⚠️ No se encontró pago de ${expected_amount:,} ARS")
        return {'received': False}

    except Exception as e:
        log(f"  ❌ Error verificando pago MP: {e}", "ERROR")
        return {'received': False, 'error': str(e)}


async def get_mp_balance(page: Page) -> float:
    """Get current MercadoPago balance."""
    try:
        await page.goto('https://www.mercadopago.com.ar/home')
        await page.wait_for_timeout(2000)

        balance_text = await page.evaluate("""
        () => {
            // Try different selectors for balance
            const selectors = [
                '[data-testid="balance-amount"]',
                '.balance-amount',
                '[class*="Balance"] span',
                'text=/\\$[\\d.,]+/'
            ];
            for (const sel of selectors) {
                const el = document.querySelector(sel);
                if (el) return el.innerText;
            }
            return null;
        }
        """)

        if balance_text:
            # Parse amount
            match = re.search(r'\$?\s*([\d.,]+)', balance_text)
            if match:
                return float(match.group(1).replace('.', '').replace(',', '.'))

        return 0
    except:
        return 0


# ==============================================================================
# MODULE 2: BINANCE P2P OPERATIONS
# ==============================================================================

async def extract_binance_orders(page: Page, order_type: str = 'all') -> List[Dict]:
    """
    Extract orders from Binance P2P orders page.
    order_type: 'buy', 'sell', or 'all'
    """
    await page.goto('https://p2p.binance.com/en/fiatOrder?tab=1')
    await page.wait_for_timeout(3000)

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

            // Determine status
            let status = 'unknown';
            if (statusLower.includes('to pay') || statusLower.includes('pending payment')) {
                status = 'to_pay';  // BUY order - we need to pay
            } else if (statusLower.includes('paid') || statusLower.includes('payment received')) {
                status = 'paid';  // SELL order - buyer paid, we need to release
            } else if (statusLower.includes('releasing') || statusLower.includes('to release')) {
                status = 'to_release';
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
                status_raw: statusCell.trim(),
                href: link?.href
            };
        }).filter(o => o.order_number);
    }
    """)

    # Filter by type if specified
    if order_type == 'buy':
        return [o for o in orders if o['type'] == 'buy']
    elif order_type == 'sell':
        return [o for o in orders if o['type'] == 'sell']

    return orders


async def get_order_payment_details(page: Page, order_href: str) -> Dict:
    """Get payment details (CVU/Alias) from order detail page."""
    await page.goto(order_href)
    await page.wait_for_timeout(2000)

    details = await page.evaluate("""
    () => {
        const text = document.body.innerText;

        // CVU (22 digits)
        const cvuMatch = text.match(/\\b(\\d{22})\\b/);

        // Alias (word.word.word pattern)
        const aliasMatch = text.match(/([a-zA-Z0-9]+\\.[a-zA-Z0-9]+\\.[a-zA-Z0-9]+)/);

        // Account holder
        const holderMatch = text.match(/Titular[:\\s]+([A-Za-z\\s]+)/i);

        // Amount in ARS
        const arsMatch = text.match(/([\\d,.]+)\\s*ARS/);

        return {
            cvu: cvuMatch ? cvuMatch[1] : null,
            alias: aliasMatch ? aliasMatch[1] : null,
            holder: holderMatch ? holderMatch[1].trim() : null,
            amount_ars: arsMatch ? parseFloat(arsMatch[1].replace(',', '')) : null
        };
    }
    """)

    return details


async def mark_order_as_paid(page: Page, order_href: str) -> bool:
    """Mark a BUY order as paid in Binance."""
    await page.goto(order_href)
    await page.wait_for_timeout(2000)

    try:
        # Look for "I've Paid" / "Transferred, notify seller" button
        paid_btn = await page.query_selector('button:has-text("Transferred")')
        if not paid_btn:
            paid_btn = await page.query_selector('button:has-text("paid")')
        if not paid_btn:
            paid_btn = await page.query_selector('button:has-text("Pagado")')

        if paid_btn:
            await paid_btn.click()
            await page.wait_for_timeout(1000)

            # Confirm if needed
            confirm_btn = await page.query_selector('button:has-text("Confirm")')
            if confirm_btn:
                await confirm_btn.click()

            log("  ✅ Marcado como pagado en Binance")
            return True
    except Exception as e:
        log(f"  ❌ Error marcando como pagado: {e}", "ERROR")

    return False


async def release_crypto(page: Page, order_href: str, config: Dict) -> bool:
    """Release crypto for a SELL order after payment verification."""
    await page.goto(order_href)
    await page.wait_for_timeout(2000)

    try:
        # Look for Release button
        release_btn = await page.query_selector('button:has-text("Release")')
        if not release_btn:
            release_btn = await page.query_selector('button:has-text("Liberar")')
        if not release_btn:
            release_btn = await page.query_selector('button:has-text("Confirm")')

        if release_btn:
            await release_btn.click()
            await page.wait_for_timeout(1000)

            # Handle 2FA if required
            twofa_input = await page.query_selector('input[placeholder*="2FA"], input[placeholder*="código"]')
            if twofa_input:
                if config.get('safety', {}).get('require_2fa_confirmation', True):
                    log("  🔐 2FA REQUERIDO - Ingresá el código manualmente", "WARN")
                    notify("P2P Daemon", "2FA requerido para liberar USDT", config)

                    # Wait for user to enter 2FA (max 2 minutes)
                    try:
                        await page.wait_for_selector('text=success', timeout=120000)
                        log("  ✅ 2FA completado, crypto liberado!")
                        return True
                    except:
                        log("  ⏱️ Timeout esperando 2FA", "ERROR")
                        return False

            # Check for success without 2FA
            await page.wait_for_timeout(2000)
            success = await page.query_selector('text=Released') or await page.query_selector('text=Completed')
            if success:
                log("  ✅ Crypto liberado exitosamente!")
                return True

            # Sometimes just confirming is enough
            confirm_final = await page.query_selector('button:has-text("Confirm")')
            if confirm_final:
                await confirm_final.click()
                await page.wait_for_timeout(2000)
                log("  ✅ Liberación confirmada")
                return True

    except Exception as e:
        log(f"  ❌ Error liberando crypto: {e}", "ERROR")

    return False


# ==============================================================================
# MODULE 3: COMPETITOR TRACKING / TOP 1
# ==============================================================================

async def get_competitor_prices(asset: str = 'USDT', fiat: str = 'ARS',
                                 trade_type: str = 'SELL',
                                 payment_methods: List[str] = None) -> List[Dict]:
    """Get competitor prices via public API."""
    if payment_methods is None:
        payment_methods = ['Mercadopago']

    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                'fiat': fiat,
                'asset': asset,
                'tradeType': trade_type.upper(),
                'page': 1,
                'rows': 20,
                'payTypes': payment_methods,
                'publisherType': None,
            }

            async with session.post(
                'https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search',
                json=payload,
                headers={'Content-Type': 'application/json'}
            ) as response:
                data = await response.json()

                if data.get('success') and data.get('data'):
                    return [
                        {
                            'advertiser': ad['advertiser']['nickName'],
                            'price': float(ad['adv']['price']),
                            'available': float(ad['adv']['surplusAmount']),
                            'min': float(ad['adv']['minSingleTransAmount']),
                            'max': float(ad['adv']['maxSingleTransAmount']),
                            'trade_methods': [m['identifier'] for m in ad['adv'].get('tradeMethods', [])],
                        }
                        for ad in data['data']
                    ]
    except Exception as e:
        log(f"Error fetching competitor prices: {e}", "ERROR")

    return []


def calculate_optimal_price(competitors: List[Dict], strategy: str = 'top1',
                           margin: float = 0.5, min_price: float = 0,
                           max_price: float = float('inf')) -> Optional[float]:
    """
    Calculate optimal price based on strategy.

    Strategies:
    - 'top1': beat first competitor by margin
    - 'undercut': beat first competitor by 0.01
    - 'top3_avg': average of top 3
    - 'fixed': return None (use fixed price from config)
    """
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

    # Apply limits
    optimal = max(min_price, min(max_price, optimal))

    return round(optimal, 2)


async def get_my_ad_price(page: Page, ad_type: str = 'sell') -> Optional[float]:
    """Get current price of my ad from advertiser management page."""
    await page.goto('https://p2p.binance.com/en/advertiserManage')
    await page.wait_for_timeout(3000)

    price = await page.evaluate(f"""
    () => {{
        // Find ad by type (Buy/Sell)
        const rows = document.querySelectorAll('table tbody tr, [class*="AdRow"]');
        for (const row of rows) {{
            const text = row.innerText || '';
            const isSell = text.includes('Sell') || text.includes('Vender');
            const isBuy = text.includes('Buy') || text.includes('Comprar');

            if (('{ad_type}' === 'sell' && isSell) || ('{ad_type}' === 'buy' && isBuy)) {{
                const priceMatch = text.match(/([\\d,.]+)\\s*ARS/);
                if (priceMatch) {{
                    return parseFloat(priceMatch[1].replace(',', ''));
                }}
            }}
        }}
        return null;
    }}
    """)

    return price


async def update_ad_price(page: Page, new_price: float, ad_type: str = 'sell') -> bool:
    """Update price of an existing ad."""
    await page.goto('https://p2p.binance.com/en/advertiserManage')
    await page.wait_for_timeout(3000)

    try:
        # Find and click edit button for the ad
        edit_success = await page.evaluate(f"""
        () => {{
            const rows = document.querySelectorAll('table tbody tr, [class*="AdRow"]');
            for (const row of rows) {{
                const text = row.innerText || '';
                const isSell = text.includes('Sell') || text.includes('Vender');
                const isBuy = text.includes('Buy') || text.includes('Comprar');

                if (('{ad_type}' === 'sell' && isSell) || ('{ad_type}' === 'buy' && isBuy)) {{
                    const editBtn = row.querySelector('button:has-text("Edit"), a:has-text("Edit"), [class*="edit"]');
                    if (editBtn) {{
                        editBtn.click();
                        return true;
                    }}
                }}
            }}
            return false;
        }}
        """)

        if not edit_success:
            # Try clicking any edit button
            edit_btn = await page.query_selector('button:has-text("Edit")')
            if edit_btn:
                await edit_btn.click()

        await page.wait_for_timeout(2000)

        # Find price input and update
        price_input = await page.query_selector('input[name*="price"], input[placeholder*="price"], input[type="number"]')
        if price_input:
            await price_input.fill('')
            await price_input.type(str(new_price))
            await page.wait_for_timeout(500)

            # Save
            save_btn = await page.query_selector('button:has-text("Post"), button:has-text("Save"), button:has-text("Confirm")')
            if save_btn:
                await save_btn.click()
                await page.wait_for_timeout(2000)
                log(f"  ✅ Precio actualizado a {new_price} ARS")
                return True

    except Exception as e:
        log(f"  ❌ Error actualizando precio: {e}", "ERROR")

    return False


# ==============================================================================
# MODULE 4: AD MANAGEMENT
# ==============================================================================

async def create_ad(page: Page, ad_config: Dict) -> bool:
    """Create a new P2P ad."""
    await page.goto('https://p2p.binance.com/en/advertiserManage/postAd')
    await page.wait_for_timeout(3000)

    try:
        # Select Buy or Sell
        if ad_config['type'] == 'sell':
            await page.click('text=I want to sell')
        else:
            await page.click('text=I want to buy')
        await page.wait_for_timeout(500)

        # Select asset (USDT, BTC, etc.)
        # This depends on the UI, may need adjustment

        # Set price
        if ad_config.get('price_type') == 'fixed':
            await page.click('text=Fixed')
            price_input = await page.query_selector('input[name*="price"]')
            if price_input:
                await price_input.fill(str(ad_config.get('fixed_price', 1200)))
        else:
            await page.click('text=Floating')
            # Set margin percentage

        # Set limits
        min_input = await page.query_selector('input[name*="min"]')
        max_input = await page.query_selector('input[name*="max"]')
        if min_input:
            await min_input.fill(str(ad_config.get('min_amount', 5000)))
        if max_input:
            await max_input.fill(str(ad_config.get('max_amount', 500000)))

        # Select payment methods
        for method in ad_config.get('payment_methods', ['Mercadopago']):
            try:
                await page.click(f'text={method}')
            except:
                pass

        # Set auto-reply
        auto_reply = ad_config.get('auto_reply')
        if auto_reply:
            reply_input = await page.query_selector('textarea[name*="reply"], textarea[placeholder*="auto"]')
            if reply_input:
                await reply_input.fill(auto_reply)

        # Post ad
        post_btn = await page.query_selector('button:has-text("Post"), button:has-text("Publish")')
        if post_btn:
            await post_btn.click()
            await page.wait_for_timeout(3000)
            log(f"  ✅ Anuncio creado: {ad_config['type'].upper()} {ad_config['asset']}")
            return True

    except Exception as e:
        log(f"  ❌ Error creando anuncio: {e}", "ERROR")

    return False


async def toggle_ad(page: Page, ad_type: str = 'sell', enable: bool = True) -> bool:
    """Enable or disable an ad."""
    await page.goto('https://p2p.binance.com/en/advertiserManage')
    await page.wait_for_timeout(3000)

    try:
        # Find toggle for the ad type
        action = 'Online' if enable else 'Offline'
        toggle = await page.query_selector(f'button:has-text("{action}"), [class*="toggle"]')
        if toggle:
            await toggle.click()
            await page.wait_for_timeout(1000)
            log(f"  ✅ Anuncio {ad_type} {'activado' if enable else 'desactivado'}")
            return True
    except Exception as e:
        log(f"  ❌ Error toggling ad: {e}", "ERROR")

    return False


# ==============================================================================
# MAIN DAEMON LOOPS
# ==============================================================================

async def monitor_orders(page: Page, config: Dict, state: Dict):
    """Main loop to monitor and process orders."""
    poll_interval = config.get('poll_interval_seconds', 30)

    while True:
        try:
            # Reset daily volume if new day
            today = datetime.now().strftime("%Y-%m-%d")
            if state.get('daily_volume_date') != today:
                state['daily_volume_ars'] = 0
                state['daily_volume_date'] = today
                state['error_count'] = 0
                save_state(state)

            # Check safety limits
            safety = config.get('safety', {})
            if state.get('error_count', 0) >= safety.get('pause_on_error_count', 3):
                log("⚠️ Demasiados errores, daemon pausado. Reiniciá manualmente.", "WARN")
                notify("P2P Daemon", "Pausado por errores", config)
                await asyncio.sleep(300)  # Wait 5 min before retrying
                continue

            # Get all pending orders
            orders = await extract_binance_orders(page)

            # Process BUY orders (we need to pay)
            buy_orders = [o for o in orders if o['type'] == 'buy' and o['status'] == 'to_pay']
            if buy_orders and config.get('buy_flow', {}).get('auto_pay', True):
                for order in buy_orders:
                    if order['order_number'] in state.get('processed_orders', []):
                        continue

                    log(f"\n🛒 ORDEN COMPRA: {order['order_number']}")
                    log(f"   Monto: ${order['amount_fiat']:,.2f} ARS")
                    log(f"   Vendedor: {order['counterparty']}")

                    # Check limits
                    if order['amount_fiat'] > safety.get('max_single_order_ars', 500000):
                        log("   ⚠️ Monto excede límite, saltando", "WARN")
                        continue

                    if state['daily_volume_ars'] + order['amount_fiat'] > safety.get('daily_volume_limit_ars', 5000000):
                        log("   ⚠️ Volumen diario excedido, saltando", "WARN")
                        continue

                    # Get payment details
                    payment = await get_order_payment_details(page, order['href'])

                    if payment.get('alias') or payment.get('cvu'):
                        dest = payment['alias'] or payment['cvu']
                        log(f"   Destino: {dest}")

                        # Execute transfer
                        success = await execute_mp_transfer(page, dest, int(order['amount_fiat']))

                        if success:
                            # Mark as paid in Binance
                            if config.get('buy_flow', {}).get('mark_as_paid_after_transfer', True):
                                await mark_order_as_paid(page, order['href'])

                            state['processed_orders'].append(order['order_number'])
                            state['daily_volume_ars'] += order['amount_fiat']
                            save_state(state)
                            log(f"   ✅ Orden procesada!")
                        else:
                            state['error_count'] = state.get('error_count', 0) + 1
                            save_state(state)
                    else:
                        log("   ⚠️ No se encontró CVU/Alias", "WARN")

            # Process SELL orders (buyer paid, we need to verify and release)
            sell_orders = [o for o in orders if o['type'] == 'sell' and o['status'] == 'paid']
            if sell_orders and config.get('sell_flow', {}).get('auto_release', True):
                for order in sell_orders:
                    if order['order_number'] in state.get('released_orders', []):
                        continue

                    log(f"\n💰 ORDEN VENTA: {order['order_number']}")
                    log(f"   Monto: ${order['amount_fiat']:,.2f} ARS")
                    log(f"   Comprador: {order['counterparty']}")

                    # Verify payment in MercadoPago
                    if config.get('sell_flow', {}).get('verify_mp_payment', True):
                        verification = await check_mp_payment_received(
                            page,
                            int(order['amount_fiat']),
                            config.get('sell_flow', {}).get('payment_verification_window_minutes', 30),
                            config.get('sell_flow', {}).get('amount_tolerance_percent', 1)
                        )

                        if not verification.get('received'):
                            log("   ⚠️ Pago NO verificado en MP, esperando...", "WARN")
                            continue

                        log(f"   ✅ Pago verificado: ${verification['amount']:,.2f} de {verification['from_name']}")

                    # Release crypto
                    released = await release_crypto(page, order['href'], config)

                    if released:
                        state['released_orders'].append(order['order_number'])
                        state['daily_volume_ars'] += order['amount_fiat']
                        save_state(state)
                        log(f"   ✅ USDT liberado!")
                    else:
                        state['error_count'] = state.get('error_count', 0) + 1
                        save_state(state)

            if not buy_orders and not sell_orders:
                log(f"⏳ Sin órdenes pendientes")

        except Exception as e:
            log(f"❌ Error en monitor_orders: {e}", "ERROR")
            state['error_count'] = state.get('error_count', 0) + 1
            save_state(state)

        await asyncio.sleep(poll_interval)


async def maintain_top1(page: Page, config: Dict, state: Dict):
    """Loop to maintain ads at Top 1 position."""
    check_interval = config.get('price_check_interval_seconds', 60)

    while True:
        try:
            for ad in config.get('ads', []):
                if not ad.get('enabled', True):
                    continue

                if ad.get('price_strategy') not in ['top1', 'undercut', 'top3_avg']:
                    continue

                trade_type = 'SELL' if ad['type'] == 'sell' else 'BUY'

                # Get competitor prices
                competitors = await get_competitor_prices(
                    asset=ad.get('asset', 'USDT'),
                    fiat=ad.get('fiat', 'ARS'),
                    trade_type=trade_type,
                    payment_methods=ad.get('payment_methods', ['Mercadopago'])
                )

                if not competitors:
                    log(f"⚠️ No se encontraron competidores para {trade_type}", "WARN")
                    continue

                # Calculate optimal price
                optimal = calculate_optimal_price(
                    competitors,
                    strategy=ad['price_strategy'],
                    margin=ad.get('price_margin', 0.5),
                    min_price=ad.get('min_price', 0),
                    max_price=ad.get('max_price', float('inf'))
                )

                if optimal is None:
                    continue

                # Get current price
                current_price = state.get('current_ad_prices', {}).get(ad['id'])

                # Only update if price changed significantly
                if current_price and abs(current_price - optimal) < 0.1:
                    continue

                log(f"📊 {ad['type'].upper()} - Top1: {competitors[0]['price']:.2f} → Óptimo: {optimal:.2f}")

                # Update price
                if await update_ad_price(page, optimal, ad['type']):
                    state['current_ad_prices'][ad['id']] = optimal
                    state['last_price_update'] = datetime.now().isoformat()
                    save_state(state)

        except Exception as e:
            log(f"❌ Error en maintain_top1: {e}", "ERROR")

        await asyncio.sleep(check_interval)


async def verify_sessions(page: Page, config: Dict):
    """Verify Binance and MercadoPago sessions are active."""
    log("🔐 Verificando sesiones...")

    # Check Binance
    await page.goto('https://p2p.binance.com/en/fiatOrder?tab=1')
    await page.wait_for_timeout(3000)

    if 'login' in page.url.lower() or 'accounts.binance' in page.url:
        log("⚠️ BINANCE: Necesita login", "WARN")
        notify("P2P Daemon", "Login requerido en Binance", config)

        for _ in range(60):
            await page.wait_for_timeout(5000)
            if 'login' not in page.url.lower() and 'accounts.binance' not in page.url:
                break
        log("✅ Binance: Sesión activa")
    else:
        log("✅ Binance: Sesión activa")

    # Check MercadoPago
    await page.goto('https://www.mercadopago.com.ar/home')
    await page.wait_for_timeout(3000)

    if 'login' in page.url.lower():
        log("⚠️ MERCADOPAGO: Necesita login", "WARN")
        notify("P2P Daemon", "Login requerido en MercadoPago", config)

        for _ in range(60):
            await page.wait_for_timeout(5000)
            if 'login' not in page.url.lower():
                break
        log("✅ MercadoPago: Sesión activa")
    else:
        log("✅ MercadoPago: Sesión activa")


async def main():
    """Main entry point."""
    global LOG_FILE, STATE_FILE

    # Load configuration
    config = load_config()
    LOG_FILE = config.get('log_file', '/tmp/p2p_daemon_v2.log')
    STATE_FILE = config.get('state_file', '/home/edu/autorenta/apps/web/tools/mercadopago-mcp/daemon_state_v2.json')

    log("=" * 70)
    log("P2P AUTOMATION DAEMON v2")
    log("=" * 70)
    log(f"Config: {CONFIG_FILE}")
    log(f"Log: {LOG_FILE}")
    log(f"State: {STATE_FILE}")
    log("-" * 70)

    # Load state
    state = load_state()

    async with async_playwright() as p:
        # Launch browser with persistent profile
        log("🚀 Iniciando browser...")
        browser = await p.chromium.launch_persistent_context(
            config.get('browser_profile', '/home/edu/.p2p-automation-profile'),
            headless=config.get('headless', False),
            viewport={'width': 1400, 'height': 900}
        )

        page = browser.pages[0] if browser.pages else await browser.new_page()
        log("✅ Browser listo")

        # Verify sessions
        await verify_sessions(page, config)

        log("-" * 70)
        log("📡 Daemon iniciado. Ctrl+C para detener.")
        log("-" * 70)

        # Run concurrent tasks
        try:
            await asyncio.gather(
                monitor_orders(page, config, state),
                maintain_top1(page, config, state),
            )
        except KeyboardInterrupt:
            log("\n🛑 Daemon detenido por usuario")
        except Exception as e:
            log(f"💥 Error fatal: {e}", "ERROR")
            raise


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n🛑 Daemon detenido")
