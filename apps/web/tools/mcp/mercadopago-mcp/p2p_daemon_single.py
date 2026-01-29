#!/usr/bin/env python3
"""
P2P Automation Daemon - Single Browser Version
Uses ONE browser with TWO tabs (Binance + MercadoPago)

Usage:
    python p2p_daemon_single.py
"""

import asyncio
import json
import os
from datetime import datetime
from playwright.async_api import async_playwright

# Configuration
BROWSER_PROFILE = "/home/edu/.p2p-automation-profile"
POLL_INTERVAL = 30  # seconds
HEADLESS = False
LOG_FILE = "/tmp/p2p_daemon.log"
STATE_FILE = "/home/edu/autorenta/apps/web/tools/mercadopago-mcp/daemon_state.json"


def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] {msg}"
    print(line)
    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {"processed_orders": []}


def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


async def notify_user():
    """Play sound and show notification."""
    os.system('paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null &')
    os.system('notify-send "P2P Daemon" "QR requerido para transferencia" 2>/dev/null &')


async def set_amount_react(page, amount: int):
    """Set amount using React's internal onChange handler."""
    amount_str = str(amount)
    for i in range(1, len(amount_str) + 1):
        partial = amount_str[:i]
        await page.evaluate(f"""
        (() => {{
            const input = document.getElementById('amount-field-input');
            if (!input) return;
            const rk = Object.keys(input).find(k => k.startsWith('__reactFiber'));
            let cur = input[rk], onChange = null;
            for (let i = 0; i < 15 && cur; i++) {{
                if (cur.memoizedProps?.onChange) {{ onChange = cur.memoizedProps.onChange; break; }}
                cur = cur.return;
            }}
            if (onChange) onChange({{ target: {{ value: '{partial}' }} }});
        }})()
        """)
        await page.wait_for_timeout(150)


async def extract_pending_orders(page):
    """Extract pending BUY orders from Binance."""
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
            const isPending = statusCell.includes('To Pay') || statusCell.includes('Pending');
            const amountText = cells[2]?.textContent || '';
            const amountMatch = amountText.match(/([\\d,.]+)/);
            const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : 0;
            const counterparty = cells[4]?.textContent?.trim() || '';
            return {
                order_number: orderNum,
                type: isBuy ? 'buy' : 'sell',
                amount_fiat: amount,
                counterparty: counterparty,
                is_pending: isPending,
                href: link?.href
            };
        }).filter(o => o.order_number && o.is_pending && o.type === 'buy');
    }
    """)
    return orders


async def get_payment_details(page, order_href):
    """Get CVU/Alias from order detail."""
    await page.goto(order_href)
    await page.wait_for_timeout(2000)

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
    return details


async def execute_transfer(page, alias_or_cvu, amount):
    """Execute MercadoPago transfer."""
    log(f"  💸 Transfiriendo ${amount} a {alias_or_cvu}")

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

    try:
        await page.wait_for_selector('text=Confirmar cuenta', timeout=10000)
        await page.click('text=Confirmar cuenta')
    except:
        log("  ❌ Cuenta no encontrada")
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
        log("  📱 QR REQUERIDO - Escaneá con la app!")
        await notify_user()

        try:
            await page.wait_for_selector('text=Le transferiste', timeout=120000)
            log("  ✅ Transferencia exitosa!")
            return True
        except:
            log("  ⏱️ Timeout QR")
            return False

    success = await page.query_selector('text=Le transferiste')
    return bool(success)


async def run_daemon():
    log("=" * 60)
    log("P2P DAEMON STARTED (Single Browser)")
    log("=" * 60)

    state = load_state()

    async with async_playwright() as p:
        log("🚀 Iniciando browser...")
        browser = await p.chromium.launch_persistent_context(
            BROWSER_PROFILE,
            headless=HEADLESS,
            viewport={'width': 1400, 'height': 900}
        )

        page = browser.pages[0] if browser.pages else await browser.new_page()
        log("✅ Browser listo")
        log("-" * 60)

        # Check if logged in to both services
        log("Verificando sesiones...")

        # Check Binance
        await page.goto('https://p2p.binance.com/en/fiatOrder?tab=1')
        await page.wait_for_timeout(3000)

        if 'login' in page.url.lower() or 'accounts.binance' in page.url:
            log("⚠️  BINANCE: Necesita login - hacelo en el browser abierto")
            await notify_user()
            # Wait for user to login (check every 5 seconds for 5 minutes)
            for _ in range(60):
                await page.wait_for_timeout(5000)
                if 'login' not in page.url.lower() and 'accounts.binance' not in page.url:
                    break
            log("✅ Binance: Login detectado")
        else:
            log("✅ Binance: Sesión activa")

        # Check MercadoPago
        await page.goto('https://www.mercadopago.com.ar/home')
        await page.wait_for_timeout(3000)

        if 'login' in page.url.lower():
            log("⚠️  MERCADOPAGO: Necesita login - hacelo en el browser abierto")
            await notify_user()
            # Wait for user to login
            for _ in range(60):
                await page.wait_for_timeout(5000)
                if 'login' not in page.url.lower():
                    break
            log("✅ MercadoPago: Login detectado")
        else:
            log("✅ MercadoPago: Sesión activa")

        log("-" * 60)
        log(f"📡 Polling cada {POLL_INTERVAL}s...")

        while True:
            try:
                # Check for pending orders
                orders = await extract_pending_orders(page)

                if orders:
                    log(f"📋 {len(orders)} orden(es) pendiente(s)")

                    for order in orders:
                        if order['order_number'] in state['processed_orders']:
                            continue

                        log(f"\n🆕 ORDEN: {order['order_number']}")
                        log(f"   Monto: ${order['amount_fiat']:,.2f} ARS")
                        log(f"   Vendedor: {order['counterparty']}")

                        # Get payment details
                        payment = await get_payment_details(page, order['href'])

                        if payment['alias'] or payment['cvu']:
                            dest = payment['alias'] or payment['cvu']
                            log(f"   Destino: {dest}")

                            # Execute transfer
                            success = await execute_transfer(page, dest, int(order['amount_fiat']))

                            if success:
                                state['processed_orders'].append(order['order_number'])
                                save_state(state)
                                log(f"   ✅ Orden procesada!")
                        else:
                            log("   ⚠️ No se encontró CVU/Alias")
                else:
                    log(f"⏳ Sin órdenes pendientes")

            except Exception as e:
                log(f"❌ Error: {e}")

            await asyncio.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    try:
        asyncio.run(run_daemon())
    except KeyboardInterrupt:
        log("\n🛑 Daemon detenido")
