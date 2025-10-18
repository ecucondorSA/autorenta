#!/usr/bin/env python3
"""
Test E2E completo del flujo de alquiler de un auto
Verifica todo el proceso desde la búsqueda hasta la solicitud de reserva
Incluye registro automático si el usuario no existe
"""
from playwright.sync_api import sync_playwright, Page, expect
import time
import random

# Credenciales de prueba
TEST_USER_EMAIL = "test@autorenta.com"
TEST_USER_PASSWORD = "Test123456!"
TEST_USER_NAME = "Usuario de Prueba E2E"

def test_booking_flow():
    """
    Test completo del flujo de booking:
    1. Navegar a lista de autos
    2. Seleccionar un auto
    3. Ver detalles del auto
    4. Hacer login si es necesario
    5. Configurar fechas de alquiler
    6. Solicitar reserva
    7. Verificar confirmación
    """

    with sync_playwright() as p:
        # Launch browser en modo visible
        browser = p.chromium.launch(headless=False, slow_mo=800)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            permissions=['geolocation'],
            geolocation={'latitude': -34.9011, 'longitude': -56.1645}
        )

        page = context.new_page()

        # Enable console logging para debugging
        def log_console(msg):
            if msg.type in ['error', 'warning']:
                print(f'[BROWSER {msg.type.upper()}] {msg.text}')
            elif 'error' in msg.text.lower() or 'failed' in msg.text.lower():
                print(f'[BROWSER] {msg.text}')

        page.on('console', log_console)

        print("\n" + "="*70)
        print("🚗 INICIANDO TEST DE FLUJO DE ALQUILER DE AUTO")
        print("="*70 + "\n")

        # ========== PASO 1: Navegar a la lista de autos ==========
        print("📍 PASO 1: Navegando a la lista de autos...")
        try:
            page.goto('http://localhost:4200/cars', wait_until='networkidle')
            print("   ✅ Página cargada correctamente")
        except Exception as e:
            print(f"   ❌ ERROR: No se pudo cargar la página - {e}")
            browser.close()
            return

        # Esperar a que carguen los autos
        try:
            page.wait_for_selector('app-car-card', timeout=10000)
            car_count = page.locator('app-car-card').count()
            print(f"   ✅ Se encontraron {car_count} autos disponibles")
        except Exception as e:
            print(f"   ❌ ERROR: No se encontraron autos disponibles - {e}")
            browser.close()
            return

        # ========== PASO 2: Seleccionar el primer auto ==========
        print("\n📍 PASO 2: Seleccionando un auto...")
        try:
            first_car = page.locator('app-car-card').first
            car_title = first_car.locator('.car-title, h3, .title').first.inner_text()
            print(f"   🚙 Auto seleccionado: {car_title}")

            # Click en "Ver detalle"
            detail_button = first_car.locator('a:has-text("Ver detalle"), button:has-text("Ver detalle")').first
            detail_button.click()
            print("   ✅ Click en 'Ver detalle'")

            # Esperar navegación
            page.wait_for_url('**/cars/**', timeout=5000)
            car_detail_url = page.url  # Guardar URL para volver después del login
            print(f"   ✅ Navegado a página de detalle: {car_detail_url}")
        except Exception as e:
            print(f"   ❌ ERROR: No se pudo seleccionar el auto - {e}")
            print(f"   URL actual: {page.url}")
            browser.close()
            return

        # ========== PASO 3: Verificar página de detalle ==========
        print("\n📍 PASO 3: Verificando página de detalle del auto...")
        time.sleep(2)  # Dar tiempo para que cargue completamente

        try:
            # Verificar que estamos en la página correcta
            page.wait_for_selector('app-car-detail-page, .car-detail', timeout=5000)
            print("   ✅ Página de detalle cargada")

            # Verificar elementos clave
            checks = {
                "Título del auto": ".car-title, h1, h2",
                "Precio": ".price, [class*='price']",
                "Características": ".features, [class*='feature']",
                "Fotos del auto": "img[alt*='auto'], img[src*='car']",
            }

            for check_name, selector in checks.items():
                try:
                    element = page.locator(selector).first
                    if element.count() > 0:
                        print(f"   ✅ {check_name} presente")
                    else:
                        print(f"   ⚠️  {check_name} no encontrado")
                except:
                    print(f"   ⚠️  {check_name} no encontrado")

        except Exception as e:
            print(f"   ❌ ERROR: Página de detalle no cargó correctamente - {e}")

        # ========== PASO 4: Configurar fechas de alquiler ==========
        print("\n📍 PASO 4: Configurando fechas de alquiler...")
        try:
            # Buscar selector de fechas
            date_selectors = [
                'app-date-range-picker',
                'input[type="date"]',
                'input[placeholder*="fecha"], input[placeholder*="Fecha"]',
                '.date-picker, [class*="date"]'
            ]

            date_picker_found = False
            for selector in date_selectors:
                if page.locator(selector).count() > 0:
                    print(f"   ✅ Selector de fechas encontrado: {selector}")
                    date_picker_found = True

                    # Intentar configurar fechas
                    try:
                        date_inputs = page.locator('input[type="date"]')
                        if date_inputs.count() >= 2:
                            # Fecha de inicio: mañana
                            date_inputs.nth(0).fill('2025-10-19')
                            # Fecha de fin: en 3 días
                            date_inputs.nth(1).fill('2025-10-22')
                            print("   ✅ Fechas configuradas (19-22 Oct 2025)")
                        else:
                            print("   ⚠️  No se pudieron configurar fechas automáticamente")
                    except Exception as e:
                        print(f"   ⚠️  Error configurando fechas: {e}")
                    break

            if not date_picker_found:
                print("   ⚠️  Selector de fechas no encontrado en la página")

        except Exception as e:
            print(f"   ⚠️  Error buscando selector de fechas - {e}")

        # ========== PASO 5: Verificar estado de autenticación ==========
        print("\n📍 PASO 5: Verificando estado de autenticación...")
        time.sleep(1)

        try:
            # Buscar botón de solicitar reserva o alquilar
            booking_buttons = [
                'button:has-text("Solicitar reserva")',
                'button:has-text("Alquilar")',
                'button:has-text("Reservar")',
                'button:has-text("Request")',
                '.book-button, .rent-button, [class*="book"], [class*="rent"]'
            ]

            booking_button = None
            for selector in booking_buttons:
                if page.locator(selector).count() > 0:
                    booking_button = page.locator(selector).first
                    button_text = booking_button.inner_text()
                    print(f"   ✅ Botón de reserva encontrado: '{button_text}'")
                    break

            if not booking_button:
                print("   ⚠️  Botón de reserva no encontrado")
                print("   💡 Puede que se requiera login primero")

                # Buscar botón de login
                login_buttons = [
                    'a:has-text("Iniciar sesión")',
                    'a:has-text("Login")',
                    'button:has-text("Iniciar sesión")',
                    '.login-button, [class*="login"]'
                ]

                for selector in login_buttons:
                    if page.locator(selector).count() > 0:
                        print(f"   ℹ️  Botón de login encontrado: {selector}")
                        break
            else:
                # Verificar si el botón está habilitado
                is_disabled = booking_button.is_disabled()
                if is_disabled:
                    print("   ⚠️  Botón de reserva está deshabilitado")
                else:
                    print("   ✅ Botón de reserva está habilitado")

        except Exception as e:
            print(f"   ⚠️  Error verificando botones - {e}")

        # ========== PASO 6: Autenticación (Register + Login) ==========
        print("\n📍 PASO 6: Verificando necesidad de autenticación...")

        # Verificar si ya estamos autenticados
        try:
            # Buscar indicadores de usuario logueado
            user_indicators = [
                '.user-menu',
                '.profile-menu',
                '[class*="user"]',
                'button:has-text("Mi perfil")',
                'a:has-text("Mi perfil")'
            ]

            is_logged_in = False
            for selector in user_indicators:
                if page.locator(selector).count() > 0:
                    is_logged_in = True
                    print("   ✅ Usuario ya está autenticado")
                    break

            if not is_logged_in:
                print("   ℹ️  Usuario no autenticado, iniciando flujo de autenticación...")

                # INTENTAR LOGIN PRIMERO
                login_url = 'http://localhost:4200/auth/login'
                print(f"   📍 Paso 6.1: Intentando login en {login_url}")
                page.goto(login_url, wait_until='networkidle')

                # Esperar el formulario de login
                page.wait_for_selector('form, input[type="email"], input[type="password"]', timeout=5000)

                # Llenar formulario de login
                email_input = page.locator('input[type="email"], input[name="email"]').first
                password_input = page.locator('input[type="password"], input[name="password"]').first

                email_input.fill(TEST_USER_EMAIL)
                password_input.fill(TEST_USER_PASSWORD)
                print(f"   📧 Credenciales ingresadas: {TEST_USER_EMAIL}")

                # Click en botón de login
                login_submit = page.locator('button[type="submit"], button:has-text("Iniciar sesión")').first
                login_submit.click()
                print("   🔐 Click en 'Iniciar sesión'")

                # Esperar respuesta (2 segundos)
                time.sleep(3)

                # Verificar si hubo error de login
                error_selectors = [
                    '.error',
                    '.alert-error',
                    '[class*="error"]',
                    'text=/Invalid.*credentials/i',
                    'text=/incorrect/i'
                ]

                login_failed = False
                for selector in error_selectors:
                    if page.locator(selector).count() > 0:
                        login_failed = True
                        try:
                            error_text = page.locator(selector).first.inner_text()
                            print(f"   ⚠️  Login falló: {error_text}")
                        except:
                            print(f"   ⚠️  Login falló (error detectado)")
                        break

                # Si el login falló, intentar REGISTRO
                if login_failed:
                    print(f"   📍 Paso 6.2: Usuario no existe, procediendo a registrarse...")

                    # Navegar a registro
                    register_url = 'http://localhost:4200/auth/register'
                    print(f"   📍 Navegando a {register_url}")
                    page.goto(register_url, wait_until='networkidle')

                    # Esperar formulario de registro
                    page.wait_for_selector('form, input[type="email"]', timeout=5000)
                    time.sleep(1)

                    # Llenar formulario de registro
                    try:
                        print("   📝 Llenando formulario de registro...")

                        # Usar formControlName ya que el formulario usa ReactiveFormsModule
                        # Nombre completo (formControlName="fullName")
                        name_input = page.locator('input[formControlName="fullName"]')
                        name_input.wait_for(state='visible', timeout=10000)
                        name_input.fill(TEST_USER_NAME)
                        print(f"      ✅ Nombre: {TEST_USER_NAME}")

                        # Email (formControlName="email")
                        email_input = page.locator('input[formControlName="email"]')
                        email_input.fill(TEST_USER_EMAIL)
                        print(f"      ✅ Email: {TEST_USER_EMAIL}")

                        # Contraseña (formControlName="password")
                        password_input = page.locator('input[formControlName="password"]')
                        password_input.fill(TEST_USER_PASSWORD)
                        print(f"      ✅ Password: {'*' * len(TEST_USER_PASSWORD)}")

                        # No hay checkbox de términos ni confirmación de contraseña en este formulario
                        time.sleep(1)

                        # Click en botón de registro (texto: "Crear cuenta")
                        register_submit = page.locator('button[type="submit"]:has-text("Crear cuenta")')
                        register_submit.wait_for(state='visible', timeout=5000)
                        register_submit.click()
                        print("   🚀 Click en 'Crear cuenta'")

                        # Esperar respuesta (puede tomar más tiempo)
                        time.sleep(4)

                        # Verificar si el registro fue exitoso
                        register_error_selectors = [
                            '.error',
                            '.alert-error',
                            'text=/already.*exists/i',
                            'text=/ya.*existe/i'
                        ]

                        registration_failed = False
                        for selector in register_error_selectors:
                            if page.locator(selector).count() > 0:
                                registration_failed = True
                                try:
                                    error_text = page.locator(selector).first.inner_text()
                                    print(f"   ⚠️  Registro falló: {error_text}")
                                except:
                                    print(f"   ⚠️  Registro falló (error detectado)")
                                break

                        if not registration_failed:
                            print("   ✅ Registro exitoso!")
                            # Puede haber redireccionado automáticamente o necesitar login
                            time.sleep(2)
                        else:
                            print("   ⚠️  No se pudo completar el registro")

                    except Exception as e:
                        print(f"   ❌ Error durante el registro: {e}")

                else:
                    print("   ✅ Login exitoso")

                # Verificar estado final de autenticación
                time.sleep(2)
                current_url = page.url
                print(f"   📍 URL actual después de auth: {current_url}")

                # Volver a la página del auto explícitamente
                print(f"   🔙 Volviendo a la página del auto: {car_detail_url}")
                page.goto(car_detail_url, wait_until='networkidle')
                time.sleep(2)

        except Exception as e:
            print(f"   ❌ Error en proceso de autenticación: {e}")

        # ========== PASO 7: Intentar solicitar reserva ==========
        print("\n📍 PASO 7: Intentando solicitar reserva...")
        time.sleep(2)

        try:
            # Buscar botón de reserva nuevamente
            booking_button = None
            for selector in booking_buttons:
                if page.locator(selector).count() > 0:
                    booking_button = page.locator(selector).first
                    break

            if booking_button and not booking_button.is_disabled():
                print("   🎯 Haciendo click en botón de reserva...")
                booking_button.click()
                time.sleep(3)  # Esperar respuesta

                # Verificar si se creó la reserva o apareció un modal
                success_indicators = [
                    '.success, .alert-success',
                    'text=/reserva.*éxito/i',
                    'text=/booking.*successful/i',
                    '.modal, .dialog',
                    'app-checkout-page'
                ]

                success_found = False
                for selector in success_indicators:
                    if page.locator(selector).count() > 0:
                        print(f"   ✅ Indicador de éxito encontrado: {selector}")
                        success_found = True

                        # Capturar mensaje
                        try:
                            message = page.locator(selector).first.inner_text()
                            print(f"   📝 Mensaje: {message[:100]}")
                        except:
                            pass
                        break

                # Verificar URL cambió (ej: a checkout o confirmación)
                current_url = page.url
                print(f"   📍 URL actual: {current_url}")

                if 'checkout' in current_url or 'booking' in current_url or 'confirm' in current_url:
                    print("   ✅ Navegación a página de checkout/confirmación")
                    success_found = True

                if not success_found:
                    # Buscar errores
                    error_indicators = [
                        '.error, .alert-error, .alert-danger',
                        'text=/error/i',
                        'text=/failed/i'
                    ]

                    for selector in error_indicators:
                        if page.locator(selector).count() > 0:
                            error_msg = page.locator(selector).first.inner_text()
                            print(f"   ❌ Error encontrado: {error_msg[:200]}")
                            break
                    else:
                        print("   ⚠️  No se encontró indicador de éxito ni error")

            else:
                print("   ⚠️  Botón de reserva no disponible o deshabilitado")

        except Exception as e:
            print(f"   ❌ ERROR al intentar solicitar reserva - {e}")

        # ========== RESUMEN FINAL ==========
        print("\n" + "="*70)
        print("📊 RESUMEN DEL TEST")
        print("="*70)
        print(f"URL final: {page.url}")
        print(f"Estado: Test completado - Revisar resultados arriba")
        print("="*70 + "\n")

        # Mantener browser abierto para inspección manual
        print("🔎 Manteniendo browser abierto por 15 segundos para inspección manual...")
        time.sleep(15)

        browser.close()
        print("\n✅ Test finalizado\n")

if __name__ == '__main__':
    test_booking_flow()
