#!/usr/bin/env python3
"""
MercadoPago Transfer Automation Script
Transfers money to a specified alias using browser automation.

Usage:
    python transfer.py <alias> <amount>
    python transfer.py eduardomarques0 100

Requirements:
    pip install playwright
    playwright install chromium
"""

import sys
import asyncio
from playwright.async_api import async_playwright

# Configuration
USER_DATA_DIR = "/home/edu/.mp-transfer-profile"  # Perfil exclusivo para este script
HEADLESS = False  # Set True for background execution

async def set_amount_react(page, amount: int):
    """
    Set amount using React's internal onChange handler.
    Must build value incrementally: 1 -> 10 -> 100
    """
    js_code = f"""
    () => {{
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

        // Build value incrementally
        const amountStr = '{amount}';
        let value = '';
        for (const digit of amountStr) {{
            value += digit;
            onChange({{ target: {{ value }} }});
        }}

        return 'ok';
    }}
    """
    result = await page.evaluate(js_code)
    return result == 'ok'


async def transfer(alias: str, amount: int):
    """Execute a MercadoPago transfer."""

    async with async_playwright() as p:
        # Launch with persistent profile (maintains login)
        browser = await p.chromium.launch_persistent_context(
            USER_DATA_DIR,
            headless=HEADLESS,
            viewport={'width': 1280, 'height': 800}
        )

        page = browser.pages[0] if browser.pages else await browser.new_page()

        try:
            print(f"🚀 Iniciando transferencia: ${amount} -> {alias}")

            # 1. Go to home
            await page.goto('https://www.mercadopago.com.ar/home')
            await page.wait_for_load_state('networkidle')
            print("✅ Home cargado")

            # 2. Click Transferir
            await page.click('text=Transferir')
            await page.wait_for_timeout(1500)
            print("✅ Click Transferir")

            # 3. Click "Con CBU, CVU o alias"
            await page.click('text=Con CBU, CVU o alias')
            await page.wait_for_timeout(1000)
            print("✅ Click CBU/CVU/alias")

            # 4. Enter alias
            await page.fill('input', alias)
            await page.click('text=Continuar')
            await page.wait_for_selector('text=Confirmar cuenta', timeout=10000)
            print(f"✅ Alias {alias} encontrado")

            # 5. Confirm account
            await page.click('text=Confirmar cuenta')
            await page.wait_for_selector('#amount-field-input', timeout=10000)
            print("✅ Cuenta confirmada")

            # 6. Enter amount (React hack)
            success = await set_amount_react(page, amount)
            if not success:
                raise Exception("Failed to set amount")
            await page.wait_for_timeout(300)
            print(f"✅ Monto ${amount} ingresado")

            # 7. Continue
            await page.click('text=Continuar')
            await page.wait_for_selector('text=Revisá si está todo bien', timeout=10000)
            print("✅ Revisión de datos")

            # 8. Execute transfer
            transfer_btn = await page.query_selector('button:has-text("Transferir")')
            if transfer_btn:
                await transfer_btn.click()
            print("✅ Transferencia iniciada")

            # 9. Wait for QR or success
            await page.wait_for_timeout(2000)

            # Check if QR verification is needed
            qr_visible = await page.query_selector('text=Escaneá el QR')
            if qr_visible:
                print("\n⚠️  VERIFICACIÓN QR REQUERIDA")
                print("📱 Escaneá el código QR con la app de MercadoPago")

                # Wait for user to scan QR (max 60 seconds)
                try:
                    await page.wait_for_selector('text=Le transferiste', timeout=60000)
                    print("\n✅ ¡TRANSFERENCIA EXITOSA!")
                except:
                    print("\n⏱️  Timeout esperando verificación QR")
            else:
                # Check for success
                success_msg = await page.query_selector('text=Le transferiste')
                if success_msg:
                    print("\n✅ ¡TRANSFERENCIA EXITOSA!")
                else:
                    print("\n❓ Estado desconocido - verificar manualmente")

            # Take screenshot
            await page.screenshot(path='/tmp/mp_transfer_result.png')
            print("📸 Screenshot guardado en /tmp/mp_transfer_result.png")

        except Exception as e:
            print(f"\n❌ Error: {e}")
            await page.screenshot(path='/tmp/mp_transfer_error.png')
            raise

        finally:
            await browser.close()


async def batch_transfer(alias: str, amount: int, count: int):
    """Execute multiple transfers to the same alias."""
    print(f"\n{'='*50}")
    print(f"BATCH TRANSFER: {count}x ${amount} -> {alias}")
    print(f"Total: ${amount * count}")
    print(f"{'='*50}\n")

    for i in range(count):
        print(f"\n--- Transferencia {i+1}/{count} ---")
        await transfer(alias, amount)
        if i < count - 1:
            print("Esperando 5 segundos antes de la siguiente...")
            await asyncio.sleep(5)

    print(f"\n{'='*50}")
    print(f"✅ BATCH COMPLETADO: {count} transferencias")
    print(f"{'='*50}")


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python transfer.py <alias> <amount> [count]")
        print("Example: python transfer.py eduardomarques0 100")
        print("Example: python transfer.py eduardomarques0 100 5  # 5 transfers")
        sys.exit(1)

    alias = sys.argv[1]
    amount = int(sys.argv[2])
    count = int(sys.argv[3]) if len(sys.argv) > 3 else 1

    if count > 1:
        asyncio.run(batch_transfer(alias, amount, count))
    else:
        asyncio.run(transfer(alias, amount))
