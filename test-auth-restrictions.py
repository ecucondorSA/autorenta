#!/usr/bin/env python3
"""
Test para verificar restricciones de autenticación en car-detail page
"""
from playwright.sync_api import sync_playwright
import sys

def test_unauthenticated_restrictions():
    """Verifica que usuarios no autenticados vean las restricciones correctas"""

    with sync_playwright() as p:
        # Lanzar navegador
        browser = p.chromium.launch(headless=False, slow_mo=1000)
        context = browser.new_context()

        # Limpiar storage para asegurar que no hay sesión
        context.clear_cookies()

        page = context.new_page()

        # Usar directamente un auto conocido (del screenshot del usuario)
        car_url = "http://localhost:4200/cars/f78c8951-b58b-4c6d-9b12-fc394a78e|3f"

        print(f"🚗 Navegando directamente a detalle de auto...")
        print(f"   URL: {car_url}")
        page.goto(car_url)
        page.wait_for_timeout(5000)  # Dar más tiempo para que cargue

        # Verificar estado del header (debería mostrar "Ingresar")
        print("\n📋 VERIFICACIÓN 1: Botón de autenticación")
        ingresar_button = page.query_selector('text=Ingresar')
        if ingresar_button:
            print("✅ Se muestra botón 'Ingresar' - Usuario NO autenticado confirmado")
        else:
            print("⚠️  No se encontró botón 'Ingresar' - Puede estar autenticado")

        # Verificar sección de anfitrión
        print("\n📋 VERIFICACIÓN 2: Sección del Anfitrión")

        # Buscar el nombre del anfitrión (EDUARDO MARQUES DA ROSA)
        owner_name = page.query_selector('text=EDUARDO MARQUES DA ROSA')
        login_prompt = page.query_selector('text=Iniciá sesión para ver los datos del anfitrión')

        if owner_name:
            print("❌ ERROR: Se muestra el nombre del anfitrión cuando NO debería")
            print(f"   Texto encontrado: {owner_name.inner_text()}")
            result_owner = False
        elif login_prompt:
            print("✅ CORRECTO: Se muestra mensaje de login en lugar del anfitrión")
            result_owner = True
        else:
            print("⚠️  No se encontró ni el nombre ni el mensaje de login")
            result_owner = False

        # Verificar botón de reserva
        print("\n📋 VERIFICACIÓN 3: Botón de Reserva")

        booking_button = page.query_selector('text=Solicitar reserva')
        login_booking_button = page.query_selector('text=Inicia sesión para reservar')

        if booking_button:
            print("❌ ERROR: Se muestra 'Solicitar reserva' cuando NO debería")
            result_button = False
        elif login_booking_button:
            print("✅ CORRECTO: Se muestra 'Inicia sesión para reservar'")
            result_button = True
        else:
            print("⚠️  No se encontró ningún botón de reserva")
            result_button = False

        # Screenshot para evidencia
        screenshot_path = "/home/edu/autorenta/test-unauthenticated.png"
        page.screenshot(path=screenshot_path)
        print(f"\n📸 Screenshot guardado en: {screenshot_path}")

        # Mantener navegador abierto un momento para inspección manual
        print("\n⏳ Navegador abierto 5 segundos para inspección...")
        page.wait_for_timeout(5000)

        browser.close()

        # Resultado final
        print("\n" + "="*50)
        print("RESULTADO FINAL:")
        print("="*50)

        if result_owner and result_button:
            print("✅ TODAS las restricciones funcionan correctamente")
            return True
        else:
            print("❌ FALLÓ: Las restricciones NO están funcionando")
            if not result_owner:
                print("   - Sección de anfitrión se muestra cuando NO debería")
            if not result_button:
                print("   - Botón de reserva incorrecto")
            return False

if __name__ == "__main__":
    try:
        success = test_unauthenticated_restrictions()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Error durante la prueba: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
