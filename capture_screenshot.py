#!/usr/bin/env python3
from playwright.sync_api import sync_playwright
import time

def capture_screenshot():
    with sync_playwright() as p:
        # Lanzar navegador
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})
        
        # Navegar a la aplicación
        print("Navegando a http://localhost:4200...")
        page.goto('http://localhost:4200', wait_until='networkidle')
        
        # Esperar un poco más para que cargue completamente
        time.sleep(2)
        
        # Capturar screenshot del header completo
        print("Capturando screenshot del header...")
        page.screenshot(path='/home/edu/autorenta/screenshot_header.png', full_page=False)
        
        # Scroll al footer y capturar
        print("Capturando screenshot del footer...")
        page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        time.sleep(1)
        page.screenshot(path='/home/edu/autorenta/screenshot_footer.png', full_page=False)
        
        # Captura de página completa
        print("Capturando screenshot de página completa...")
        page.screenshot(path='/home/edu/autorenta/screenshot_full.png', full_page=True)
        
        browser.close()
        print("✅ Screenshots guardados!")
        print("  - screenshot_header.png")
        print("  - screenshot_footer.png")
        print("  - screenshot_full.png")

if __name__ == '__main__':
    capture_screenshot()
