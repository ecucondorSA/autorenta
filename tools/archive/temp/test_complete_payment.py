#!/usr/bin/env python3
"""
Script para completar un pago de prueba en MercadoPago.

Este script:
1. Llama a la Edge Function para crear la preferencia
2. Abre el checkout de MercadoPago en el navegador
3. El usuario completa el pago con tarjeta de prueba
4. MercadoPago llama al webhook
5. El webhook actualiza la transacción
"""

import subprocess
import json
import os
import time
from playwright.sync_api import sync_playwright

# Configuración
TRANSACTION_ID = "616cd44f-ff00-4cac-8c46-5be50154b985"
AMOUNT = 100
SUPABASE_URL = "https://obxvffplochgeiclibng.supabase.co"
EDGE_FUNCTION_URL = f"{SUPABASE_URL}/functions/v1/mercadopago-create-preference"

# Test card data (from MercadoPago docs)
TEST_CARD = {
    "number": "5031 7557 3453 0604",  # Mastercard aprobada
    "holder": "APRO",
    "expiry": "11/25",
    "cvv": "123",
    "email": "test@test.com"
}

def get_auth_token():
    """Obtiene un token JWT válido para el usuario de prueba."""
    # Aquí necesitarías hacer login con Supabase Auth
    # Por ahora, retornamos None para hacer una llamada sin auth
    return None

def create_preference():
    """Llama a la Edge Function para crear la preferencia."""
    print(f"📋 Creando preferencia de pago para transaction_id: {TRANSACTION_ID}")

    payload = {
        "transaction_id": TRANSACTION_ID,
        "amount": AMOUNT,
        "description": "Test Deposit - Wallet AutoRenta"
    }

    # Nota: En producción necesitarías un token JWT válido
    # Por ahora probamos sin auth para ver si la función está funcionando

    cmd = [
        "curl", "-s", "-X", "POST", EDGE_FUNCTION_URL,
        "-H", "Content-Type: application/json",
        "-d", json.dumps(payload)
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"❌ Error ejecutando curl: {result.stderr}")
        return None

    try:
        response = json.loads(result.stdout)
        print(f"✅ Respuesta de Edge Function:")
        print(json.dumps(response, indent=2))
        return response
    except json.JSONDecodeError as e:
        print(f"❌ Error parseando respuesta: {e}")
        print(f"Respuesta raw: {result.stdout}")
        return None

def complete_payment_with_browser(init_point):
    """Abre el checkout de MercadoPago y completa el pago automáticamente."""
    print(f"\n🌐 Abriendo checkout de MercadoPago...")
    print(f"URL: {init_point}")

    headless = os.environ.get("HEADLESS", "false").lower() == "true"
    slow_mo = int(os.environ.get("SLOW_MO", "1000"))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless, slow_mo=slow_mo)
        page = browser.new_page()

        try:
            # Navegar al checkout
            print("📍 Navegando al checkout...")
            page.goto(init_point, wait_until="networkidle")
            time.sleep(2)

            # Esperar a que cargue el formulario
            print("⏳ Esperando formulario de pago...")
            page.wait_for_selector('input[name="cardNumber"]', timeout=30000)

            # Llenar datos de la tarjeta
            print("💳 Llenando datos de tarjeta de prueba...")

            # Número de tarjeta
            card_input = page.locator('input[name="cardNumber"]')
            card_input.fill(TEST_CARD["number"])
            time.sleep(0.5)

            # Nombre del titular
            holder_input = page.locator('input[name="cardholderName"]')
            holder_input.fill(TEST_CARD["holder"])
            time.sleep(0.5)

            # Fecha de expiración
            expiry_input = page.locator('input[name="cardExpirationDate"]')
            expiry_input.fill(TEST_CARD["expiry"])
            time.sleep(0.5)

            # CVV
            cvv_input = page.locator('input[name="securityCode"]')
            cvv_input.fill(TEST_CARD["cvv"])
            time.sleep(0.5)

            # Email
            email_input = page.locator('input[name="email"]')
            if email_input.is_visible():
                email_input.fill(TEST_CARD["email"])
                time.sleep(0.5)

            # Hacer clic en el botón de pagar
            print("✅ Enviando pago...")
            pay_button = page.locator('button[type="submit"]')
            pay_button.click()

            # Esperar respuesta
            print("⏳ Esperando confirmación de pago...")
            page.wait_for_url("**/wallet?payment=success**", timeout=60000)

            print("✅ Pago completado exitosamente!")
            print(f"📍 URL final: {page.url}")

            time.sleep(3)

        except Exception as e:
            print(f"❌ Error durante el pago: {e}")
            # Tomar screenshot para debug
            page.screenshot(path="/tmp/mp_error.png")
            print("📸 Screenshot guardado en /tmp/mp_error.png")
        finally:
            browser.close()

def verify_transaction_status():
    """Verifica el estado de la transacción en la base de datos."""
    print("\n🔍 Verificando estado de la transacción...")

    cmd = [
        "PGPASSWORD=ECUCONDOR08122023",
        "psql",
        "postgresql://postgres.obxvffplochgeiclibng:ECUCONDOR08122023@aws-1-us-east-2.pooler.supabase.com:6543/postgres",
        "-c",
        f"SELECT id, amount, status, type, provider_metadata FROM wallet_transactions WHERE id = '{TRANSACTION_ID}';"
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)

def main():
    print("=" * 60)
    print("🚀 TEST DE PAGO COMPLETO - MercadoPago + Wallet")
    print("=" * 60)

    # Paso 1: Crear preferencia
    response = create_preference()
    if not response:
        print("\n❌ No se pudo crear la preferencia. Abortando.")
        return

    if "error" in response:
        print(f"\n❌ Error de Edge Function: {response['error']}")
        return

    # Paso 2: Obtener URL de checkout
    init_point = response.get("init_point") or response.get("sandbox_init_point")
    if not init_point:
        print("\n❌ No se recibió init_point en la respuesta")
        return

    # Paso 3: Completar pago en el navegador
    try:
        complete_payment_with_browser(init_point)
    except Exception as e:
        print(f"\n❌ Error al completar pago: {e}")

    # Paso 4: Verificar transacción
    time.sleep(5)  # Esperar a que el webhook procese
    verify_transaction_status()

    print("\n" + "=" * 60)
    print("✅ Test completado")
    print("=" * 60)

if __name__ == "__main__":
    main()
