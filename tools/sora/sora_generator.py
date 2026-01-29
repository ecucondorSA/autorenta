#!/usr/bin/env python3
"""
Sora 2 Generator - Chrome Profile Edition
Usa tu perfil de Chrome existente para generar videos, evitando logins y bloqueos.

Requisitos:
    pip install patchright asyncio

Uso:
    python sora_generator.py --prompt "Tu descripción del video"
"""

import asyncio
import argparse
import os
import sys
import subprocess
from patchright.async_api import async_playwright

CHROME_PROFILE_DIR = os.path.expanduser('~/.config/google-chrome')
SORA_URL = "https://sora.chatgpt.com"

def kill_chrome():
    """Cierra Chrome para liberar el perfil."""
    try:
        subprocess.run(['pkill', '-f', 'chrome'], stderr=subprocess.DEVNULL)
        # Limpiar lock si existe
        lock_file = os.path.join(CHROME_PROFILE_DIR, 'SingletonLock')
        if os.path.exists(lock_file):
            os.remove(lock_file)
        print("🧹 Chrome cerrado y perfil liberado.")
    except Exception:
        pass

async def main():
    parser = argparse.ArgumentParser(description="AutoRenta Sora Generator")
    parser.add_argument("--prompt", "-p", required=True, help="Descripción del video")
    parser.add_argument("--duration", "-d", default="5s", help="Duración (ej. 5s)")
    args = parser.parse_args()

    # 1. Preparar entorno
    kill_chrome()
    
    async with async_playwright() as p:
        print("🚀 Iniciando Chrome con tu perfil...")
        
        # 2. Lanzar browser con tu perfil (Persistente)
        try:
            context = await p.chromium.launch_persistent_context(
                user_data_dir=CHROME_PROFILE_DIR,
                channel='chrome',
                headless=False,  # Visible para ver qué pasa
                args=[
                    '--profile-directory=Default',  # Tu perfil principal
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--start-maximized'
                ],
                ignore_default_args=['--enable-automation'],
                viewport=None
            )
        except Exception as e:
            print(f"❌ Error abriendo Chrome: {e}")
            print("Asegúrate de haber cerrado Google Chrome totalmente.")
            return

        page = context.pages[0] if context.pages else await context.new_page()
        
        # 3. Ir a Sora
        print(f"📍 Navegando a {SORA_URL}...")
        try:
            await page.goto(SORA_URL, timeout=60000)
        except Exception:
            print("⚠️ Timeout cargando página, intentando continuar...")

        # 4. Verificar Login
        try:
            # Si aparece botón de Login, hacer click
            login_btn = await page.query_selector('button:has-text("Iniciar sesión"), button:has-text("Login")')
            if login_btn:
                print("🔑 Sesión expirada. Intentando re-conectar...")
                await login_btn.click()
                await asyncio.sleep(2)
                
                # Intentar click en Google
                google_btn = await page.query_selector('button:has-text("Google"), [data-provider="google"]')
                if google_btn:
                    await google_btn.click()
                
                print("⏳ Por favor, completa el login en el navegador si es necesario...")
                # Esperar a que aparezca el input (señal de login exitoso)
                await page.wait_for_selector('textarea, [contenteditable]', timeout=120000)
        except Exception:
            pass # Asumimos que ya estamos logueados si no encontramos botones

        # 5. Generar Video
        print("✨ Buscando campo de prompt...")
        try:
            # Buscar textarea
            textarea = await page.wait_for_selector('textarea, [contenteditable]', state='visible', timeout=30000)
            
            if textarea:
                print(f"📝 Escribiendo prompt: {args.prompt[:50]}...")
                await textarea.fill(args.prompt)
                await asyncio.sleep(1)
                
                await page.keyboard.press('Enter')
                print("🚀 ¡Comando enviado! Esperando generación (esto puede tardar unos minutos)...")
                
                # 6. Esperar y Descargar
                # Esperar a que aparezca un nuevo video procesando o completado
                # Estrategia: Buscar el último video tag que aparezca
                try:
                    # Esperamos hasta 5 minutos
                    video_element = await page.wait_for_selector('video', timeout=300000)
                    
                    # Esperar a que el video tenga src (esté listo)
                    print("⏳ Generando... (No cierres la ventana)")
                    
                    # Polling para ver si el video está listo (src blob o url real)
                    for i in range(60):
                        src = await video_element.get_attribute('src')
                        if src and 'blob' not in src: # URL real
                            print(f"✅ Video URL encontrada: {src[:50]}...")
                            break
                        await asyncio.sleep(5)
                    
                    # Descargar
                    if src:
                        filename = f"sora_output_{args.duration}.mp4"
                        print(f"📥 Descargando a {filename}...")
                        
                        # Usar download helper de playwright si es posible, o request
                        async with page.expect_download() as download_info:
                            # A veces hay botón de descarga, a veces hay que navegar al src
                            # Disparo descarga navegando si no hay boton
                            await page.evaluate(f"window.open('{src}')")
                            
                        download = await download_info.value
                        await download.save_as(filename)
                        print(f"🎉 VIDEO GUARDADO: {os.path.abspath(filename)}")
                    
                except Exception as e:
                    print(f"⚠️ No se pudo descargar automáticamente: {e}")
                    print("El video debería estar disponible en tu historial de Sora.")

            else:
                print("❌ No se encontró el campo de texto. ¿Error de carga?")
                
        except Exception as e:
            print(f"❌ Error durante la generación: {e}")
            await page.screenshot(path='error_generation.png')

        # Cerrar
        print("👋 Cerrando en 5 segundos...")
        await asyncio.sleep(5)
        await context.close()

if __name__ == "__main__":
    asyncio.run(main())
