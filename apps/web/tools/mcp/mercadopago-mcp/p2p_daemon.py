#!/usr/bin/env python3
"""
P2P Automation Daemon
Monitors Binance for new orders and executes MercadoPago transfers.

Flow:
1. Poll Binance orders page every 30 seconds
2. Detect new BUY orders (we buy USDT, need to pay seller)
3. Extract seller's CVU/Alias from order details
4. Execute MercadoPago transfer
5. Mark as paid in Binance
6. Wait for seller to release crypto

Usage:
    python p2p_daemon.py

Requirements:
    pip install playwright
    playwright install chromium
"""

import asyncio
import json
import os
from datetime import datetime
from playwright.async_api import async_playwright

# Configuration - usando perfiles existentes con sesión
BINANCE_PROFILE = "/home/edu/.binance-browser-profile"
MERCADOPAGO_PROFILE = "/home/edu/.mercadopago-browser-profile"
POLL_INTERVAL = 30  # seconds
HEADLESS = False
LOG_FILE = "/tmp/p2p_daemon.log"

# State file to track processed orders
STATE_FILE = "/home/edu/autorenta/apps/web/tools/mercadopago-mcp/daemon_state.json"


def log(msg):
    """Log message with timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def load_state():
    """Load processed orders from state file."""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {"processed_orders": []}


def save_state(state):
    """Save state to file."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


async def set_amount_react(page, amount: int):
    """Set amount using React's internal onChange handler."""
    # Build value incrementally: 1 -> 10 -> 100
    amount_str = str(amount)
    for i in range(1, len(amount_str) + 1):
        partial = amount_str[:i]
        js_code = f"""
        (() => {{
            const input = document.getElementById('amount-field-input');
            if (!input) return 'input not found';
            const reactKey = Object.keys(input).find(k => k.startsWith('__reactFiber'));
            if (!reactKey) return 'react not found';
            let current = input[reactKey];
            let onChange = null;
            for (let i = 0; i < 15 && current; i++) {{
                if (current.memoizedProps?.onChange) {{
                    onChange = current.memoizedProps.onChange;
                    break;
                }}
                current = current.return;
            }}
            if (!onChange) return 'onChange not found';
            onChange({{ target: {{ value: '{partial}' }} }});
            return 'ok';
        }})()
        """
        await page.evaluate(js_code)
        await page.wait_for_timeout(100)
    return True


async def extract_binance_orders(page):
    """Extract pending orders from Binance P2P orders page."""
    orders = await page.evaluate("""
    () => {
        const rows = document.querySelectorAll('table tbody tr');
        return Array.from(rows).map(row => {
            const cells = row.querySelectorAll('td');
            const link = row.querySelector('a[href*="fiatOrderDetail"]');
            const orderNum = link?.textContent?.match(/\\d{19,20}/)?.[0];

            // Get order type (Buy/Sell)
            const typeCell = cells[1]?.textContent || '';
            const isBuy = typeCell.includes('Buy');

            // Get status
            const statusCell = cells[5]?.textContent || '';
            const isPending = statusCell.includes('To Pay') || statusCell.includes('Pending');

            // Get amount
            const amountText = cells[2]?.textContent || '';
            const amountMatch = amountText.match(/([\\d,.]+)/);
            const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;

            // Get counterparty
            const counterparty = cells[4]?.textContent?.trim() || '';

            return {
                order_number: orderNum,
                type: isBuy ? 'buy' : 'sell',
                amount_fiat: amount,
                counterparty: counterparty,
                status: statusCell.trim(),
                is_pending: isPending,
                href: link?.href
            };
        }).filter(o => o.order_number);
    }
    """)
    return orders


async def extract_payment_details(page, order_href):
    """Navigate to order detail and extract payment CVU/Alias."""
    await page.goto(order_href)
    await page.wait_for_timeout(2000)

    # Try to find payment details
    details = await page.evaluate("""
    () => {
        const text = document.body.innerText;

        // Look for CVU (22 digits)
        const cvuMatch = text.match(/\\b(\\d{22})\\b/);

        // Look for alias (word.word.word pattern)
        const aliasMatch = text.match(/([a-zA-Z0-9]+\\.[a-zA-Z0-9]+\\.[a-zA-Z0-9]+)/);

        // Look for account holder name
        const holderMatch = text.match(/Titular[:\\s]+([A-Za-z\\s]+)/i);

        return {
            cvu: cvuMatch ? cvuMatch[1] : null,
            alias: aliasMatch ? aliasMatch[1] : null,
            holder: holderMatch ? holderMatch[1].trim() : null
        };
    }
    """)
    return details


async def execute_mp_transfer(page, alias_or_cvu, amount):
    """Execute MercadoPago transfer."""
    log(f"  Ejecutando transferencia: ${amount} -> {alias_or_cvu}")

    # Go to home
    await page.goto('https://www.mercadopago.com.ar/home')
    await page.wait_for_timeout(2000)

    # Click Transferir
    await page.click('text=Transferir')
    await page.wait_for_timeout(1500)

    # Click "Con CBU, CVU o alias"
    await page.click('text=Con CBU, CVU o alias')
    await page.wait_for_timeout(1000)

    # Enter alias/CVU
    await page.fill('input', alias_or_cvu)
    await page.click('text=Continuar')

    # Wait for account confirmation
    try:
        await page.wait_for_selector('text=Confirmar cuenta', timeout=10000)
        await page.click('text=Confirmar cuenta')
    except:
        log("  ❌ No se encontró la cuenta")
        return False

    # Wait for amount input
    await page.wait_for_selector('#amount-field-input', timeout=10000)

    # Enter amount using React hack
    await set_amount_react(page, amount)
    await page.wait_for_timeout(300)

    # Continue
    await page.click('text=Continuar')
    await page.wait_for_selector('text=Revisá si está todo bien', timeout=10000)

    # Execute transfer
    transfer_btn = await page.query_selector('button:has-text("Transferir")')
    if transfer_btn:
        await transfer_btn.click()

    await page.wait_for_timeout(2000)

    # Check for QR
    qr_visible = await page.query_selector('text=Escaneá el QR')
    if qr_visible:
        log("  ⚠️  QR REQUERIDO - Escaneá con la app de MercadoPago")
        # Play notification sound
        os.system('paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null || echo -e "\\a"')

        # Wait for QR scan (max 60 seconds)
        try:
            await page.wait_for_selector('text=Le transferiste', timeout=60000)
            log("  ✅ Transferencia exitosa!")
            return True
        except:
            log("  ⏱️  Timeout esperando QR")
            return False

    # Check for success without QR
    success = await page.query_selector('text=Le transferiste')
    if success:
        log("  ✅ Transferencia exitosa (sin QR)!")
        return True

    return False


async def mark_as_paid_binance(page, order_href):
    """Mark order as paid in Binance."""
    await page.goto(order_href)
    await page.wait_for_timeout(2000)

    # Look for "I've Paid" or "Transferred, notify seller" button
    try:
        paid_btn = await page.query_selector('button:has-text("Transferred")')
        if not paid_btn:
            paid_btn = await page.query_selector('button:has-text("paid")')
        if paid_btn:
            await paid_btn.click()
            log("  ✅ Marcado como pagado en Binance")
            return True
    except:
        pass

    log("  ⚠️  No se pudo marcar como pagado automáticamente")
    return False


async def run_daemon():
    """Main daemon loop."""
    log("=" * 60)
    log("P2P AUTOMATION DAEMON STARTED")
    log("=" * 60)

    state = load_state()

    async with async_playwright() as p:
        # Launch Binance browser
        log("Iniciando browser Binance...")
        binance_browser = await p.chromium.launch_persistent_context(
            BINANCE_PROFILE,
            headless=HEADLESS,
            viewport={'width': 1280, 'height': 800}
        )
        binance_page = binance_browser.pages[0] if binance_browser.pages else await binance_browser.new_page()

        # Launch MercadoPago browser
        log("Iniciando browser MercadoPago...")
        mp_browser = await p.chromium.launch_persistent_context(
            MERCADOPAGO_PROFILE,
            headless=HEADLESS,
            viewport={'width': 1280, 'height': 800}
        )
        mp_page = mp_browser.pages[0] if mp_browser.pages else await mp_browser.new_page()

        log("Browsers iniciados. Comenzando polling...")
        log("-" * 60)

        while True:
            try:
                # Navigate to Binance orders
                await binance_page.goto('https://p2p.binance.com/en/fiatOrder?tab=1')
                await binance_page.wait_for_timeout(3000)

                # Extract orders
                orders = await extract_binance_orders(binance_page)
                pending_orders = [o for o in orders if o['is_pending'] and o['type'] == 'buy']

                if pending_orders:
                    log(f"📋 {len(pending_orders)} orden(es) pendiente(s) encontrada(s)")

                    for order in pending_orders:
                        order_num = order['order_number']

                        # Skip if already processed
                        if order_num in state['processed_orders']:
                            continue

                        log(f"\n🆕 NUEVA ORDEN: {order_num}")
                        log(f"   Tipo: {order['type'].upper()}")
                        log(f"   Monto: ${order['amount_fiat']:,.2f} ARS")
                        log(f"   Contraparte: {order['counterparty']}")

                        # Extract payment details
                        log("   Extrayendo datos de pago...")
                        payment = await extract_payment_details(binance_page, order['href'])

                        if payment['alias'] or payment['cvu']:
                            alias_or_cvu = payment['alias'] or payment['cvu']
                            log(f"   CVU/Alias: {alias_or_cvu}")

                            # Execute MercadoPago transfer
                            amount = int(order['amount_fiat'])
                            success = await execute_mp_transfer(mp_page, alias_or_cvu, amount)

                            if success:
                                # Mark as paid in Binance
                                await mark_as_paid_binance(binance_page, order['href'])

                                # Mark as processed
                                state['processed_orders'].append(order_num)
                                save_state(state)
                                log(f"   ✅ Orden {order_num} procesada completamente")
                            else:
                                log(f"   ❌ Falló la transferencia para orden {order_num}")
                        else:
                            log("   ⚠️  No se encontraron datos de pago (CVU/Alias)")
                else:
                    log(f"⏳ Sin órdenes pendientes - próximo check en {POLL_INTERVAL}s")

            except Exception as e:
                log(f"❌ Error: {e}")

            # Wait before next poll
            await asyncio.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    try:
        asyncio.run(run_daemon())
    except KeyboardInterrupt:
        log("\n🛑 Daemon detenido por usuario")
