#!/usr/bin/env python3
"""
Script para depurar el problema del wallet usando Selenium.
Toma screenshots y analiza los errores de la consola.
"""

import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from datetime import datetime

def setup_driver():
    """Configura el driver de Chrome con las opciones necesarias"""
    options = Options()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    # Habilitar logging de consola
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

    driver = webdriver.Chrome(options=options)
    return driver

def clear_service_worker(driver, url):
    """Limpia el service worker y caché del sitio"""
    print("🧹 Limpiando service worker y caché...")

    # Navegar a la página
    driver.get(url)
    time.sleep(2)

    # Ejecutar script para desregistrar service workers
    script = """
    // Desregistrar todos los service workers
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister().then(function(boolean) {
                console.log('Service Worker desregistrado:', boolean);
            });
        }
    });

    // Limpiar todos los caches
    caches.keys().then(function(names) {
        for (let name of names) {
            caches.delete(name).then(function(boolean) {
                console.log('Cache eliminado:', name, boolean);
            });
        }
    });

    // Limpiar localStorage y sessionStorage
    localStorage.clear();
    sessionStorage.clear();

    return 'Limpieza completada';
    """

    result = driver.execute_script(script)
    print(f"   Resultado: {result}")
    time.sleep(3)

    # Recargar la página
    print("   Recargando página...")
    driver.refresh()
    time.sleep(5)

def take_screenshot(driver, name):
    """Toma un screenshot con timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"screenshot_{name}_{timestamp}.png"
    driver.save_screenshot(filename)
    print(f"📸 Screenshot guardado: {filename}")
    return filename

def get_console_logs(driver):
    """Obtiene los logs de la consola del navegador"""
    logs = driver.get_log('browser')
    return logs

def test_wallet_deposit(driver, url):
    """Prueba el proceso de depósito del wallet"""
    print("\n🔍 Iniciando prueba de depósito...")

    # Navegar al wallet
    wallet_url = f"{url}/wallet"
    print(f"   Navegando a: {wallet_url}")
    driver.get(wallet_url)
    time.sleep(5)

    # Tomar screenshot inicial
    take_screenshot(driver, "wallet_page")

    # Verificar logs de consola
    print("\n📋 Logs de consola iniciales:")
    logs = get_console_logs(driver)
    for log in logs[-10:]:  # Últimos 10 logs
        print(f"   [{log['level']}] {log['message']}")

    # Ejecutar diagnóstico en consola
    print("\n🔬 Ejecutando diagnóstico...")
    diagnostic_script = """
    console.log('====== DIAGNÓSTICO DE WALLET ======');

    // 1. Verificar Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            console.log('Service Workers registrados:', regs.length);
            regs.forEach(reg => {
                console.log('  - SW:', reg.scope, 'Active:', reg.active?.state);
            });
        });
    }

    // 2. Verificar configuración
    console.log('Window.__env:', window.__env);
    console.log('Supabase URL:', window.__env?.NG_APP_SUPABASE_URL);

    // 3. Verificar caches
    if ('caches' in window) {
        caches.keys().then(names => {
            console.log('Caches activos:', names);
        });
    }

    // 4. Test de fetch directo
    const testUrl = 'https://obxvffplochgeiclibng.supabase.co/rest/v1/';
    fetch(testUrl)
        .then(res => console.log('Test fetch a Supabase:', res.status))
        .catch(err => console.error('Error en test fetch:', err));

    return 'Diagnóstico ejecutado';
    """

    result = driver.execute_script(diagnostic_script)
    print(f"   Resultado: {result}")
    time.sleep(3)

    # Obtener logs actualizados
    print("\n📋 Logs después del diagnóstico:")
    logs = get_console_logs(driver)
    for log in logs[-15:]:
        print(f"   [{log['level']}] {log['message']}")

    return logs

def main():
    """Función principal"""
    print("🚀 Iniciando debug del wallet...\n")

    # URL del deployment
    url = "https://4ca9b6b9.autorenta-web.pages.dev"

    # Configurar driver
    driver = setup_driver()

    try:
        # Limpiar service worker y caché
        clear_service_worker(driver, url)

        # Ejecutar prueba
        logs = test_wallet_deposit(driver, url)

        # Análisis de errores
        print("\n⚠️ Errores encontrados:")
        errors = [log for log in logs if 'error' in log['message'].lower() or log['level'] == 'SEVERE']
        for error in errors:
            print(f"   ❌ {error['message']}")

        # Recomendaciones
        print("\n💡 Recomendaciones:")
        if any('service worker' in log['message'].lower() for log in logs):
            print("   1. El Service Worker está causando problemas con el caché")
            print("   2. Necesitamos actualizar ngsw-config.json para excluir las rutas de RPC")

        if any('404' in log['message'] for log in logs):
            print("   3. El Service Worker está devolviendo 404 para las llamadas RPC")
            print("   4. Esto indica que está tratando de cachear llamadas de API")

        # Mantener el navegador abierto para inspección manual
        print("\n⏸️ Navegador abierto para inspección manual.")
        print("   Presiona Enter para cerrar...")
        input()

    finally:
        driver.quit()
        print("\n✅ Debug completado")

if __name__ == "__main__":
    main()