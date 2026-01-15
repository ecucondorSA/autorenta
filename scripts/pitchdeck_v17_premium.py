#!/usr/bin/env python3
"""
AutoRentar Pitch Deck V17 - Premium Edition
Usa fondos visuales + tipografía mejorada + espaciado profesional
"""

import fitz
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════════════

BACKGROUNDS_PDF = Path("/mnt/storage/Downloads/AutoRentar-PitchDeck-SoloFondos.pdf")
AUTO_OPEN = True  # Abrir automáticamente al finalizar

def hex_to_rgb(h: str) -> tuple:
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))

# Paleta de colores Premium (Midnight Emerald + Neon Accents)
C = {
    "primary": hex_to_rgb("#10B981"),     # Emerald
    "accent": hex_to_rgb("#D4ED31"),      # Lime Neon
    "secondary": hex_to_rgb("#3B82F6"),   # Blue
    "bg": hex_to_rgb("#020617"),          # Deepest Navy
    "card": hex_to_rgb("#0F172A"),        # Slate Navy
    "card_alpha": (15/255, 23/255, 42/255),
    "white": hex_to_rgb("#F8FAFC"),
    "gray": hex_to_rgb("#94A3B8"),
    "muted": hex_to_rgb("#475569"),
    "red": hex_to_rgb("#EF4444"),
    "gold": hex_to_rgb("#F59E0B"),
}

# Configuración tipográfica avanzada
FONT = "helv"
FONT_BOLD = "hebo"

# Layout Grid
MARGIN = 80
SAFE_AREA = 1120 # 1280 - 2*MARGIN

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS DE DISEÑO PREMIUM
# ═══════════════════════════════════════════════════════════════════════════════

def draw_ghost_number(page, text, pos=(MARGIN, 680)):
    """Dibuja un número gigante semitransparente de fondo."""
    page.insert_text(
        pos,
        text,
        fontsize=280,
        fontname=FONT_BOLD,
        color=C["card"],
        fill_opacity=0.3
    )

def draw_progress_bar(page, x, y, w, percentage, label, value_text):
    """Barra de progreso estilizada."""
    h = 8
    # Track
    page.draw_rect(fitz.Rect(x, y, x + w, y + h), color=None, fill=C["muted"], fill_opacity=0.2)
    # Value
    page.draw_rect(fitz.Rect(x, y, x + w * percentage, y + h), color=None, fill=C["primary"])
    
    # Textos
    page.insert_text((x, y - 15), label, fontsize=12, fontname=FONT, color=C["gray"])
    page.insert_text((x + w - 40, y - 15), value_text, fontsize=12, fontname=FONT_BOLD, color=C["white"])

def draw_decoration_line(page, x, y, w):
    """Línea decorativa fina con gradiente visual."""
    shape = page.new_shape()
    shape.draw_line(fitz.Point(x, y), fitz.Point(x + w, y))
    shape.finish(color=C["primary"], width=1.5, stroke_opacity=0.5)
    shape.commit()

def draw_text_with_shadow(page, pos, text, fontsize, color, fontname=FONT, opacity=1.0):
    x, y = pos
    page.insert_text((x + 1.5, y + 1.5), text, fontsize=fontsize, fontname=fontname, color=(0,0,0), fill_opacity=0.4)
    page.insert_text((x, y), text, fontsize=fontsize, fontname=fontname, color=color, fill_opacity=opacity)

def draw_overlay(page, rect, opacity=0.85):
    """Overlay oscuro semitransparente."""
    shape = page.new_shape()
    shape.draw_rect(rect)
    shape.finish(fill=C["bg"], fill_opacity=opacity)
    shape.commit()

def draw_card_overlay(page, x, y, w, h, opacity=0.9, border=None):
    """Card con fondo semitransparente."""
    rect = fitz.Rect(x, y, x + w, y + h)
    shape = page.new_shape()
    shape.draw_rect(rect)
    if border:
        shape.finish(fill=C["card"], fill_opacity=opacity, color=border, width=2)
    else:
        shape.finish(fill=C["card"], fill_opacity=opacity)
    shape.commit()
    return rect

def draw_title_block(page, y, title, subtitle=None, overlay=True):
    """Bloque de título con overlay opcional."""
    w = page.rect.width

    if overlay:
        draw_card_overlay(page, MARGIN - 20, y - 20, w - 2*MARGIN + 40, 100 if subtitle else 70, 0.92)

    # Título principal - más grande y espaciado
    page.insert_text(
        (MARGIN, y + 35),
        title,
        fontsize=42,
        fontname=FONT,
        color=C["white"]
    )

    if subtitle:
        page.insert_text(
            (MARGIN, y + 70),
            subtitle,
            fontsize=16,
            fontname=FONT,
            color=C["accent"]
        )

    return y + (110 if subtitle else 80)

def draw_section_header(page, x, y, text):
    """Header de sección en verde lima."""
    page.insert_text(
        (x, y),
        text.upper(),
        fontsize=12,
        fontname=FONT,
        color=C["accent"]
    )
    return y + 30

def draw_metric_large(page, x, y, value, label, desc=None):
    """Métrica grande con valor destacado."""
    # Card
    card_w = 320
    card_h = 100
    draw_card_overlay(page, x, y, card_w, card_h, 0.95)

    # Valor grande en verde
    page.insert_text(
        (x + 24, y + 55),
        value,
        fontsize=36,
        fontname=FONT,
        color=C["accent"]
    )

    # Label pequeño
    page.insert_text(
        (x + 24, y + 80),
        label,
        fontsize=10,
        fontname=FONT,
        color=C["gray"]
    )

    # Descripción al lado
    if desc:
        desc_rect = fitz.Rect(x + card_w + 30, y + 30, x + card_w + 550, y + card_h - 10)
        page.insert_textbox(
            desc_rect,
            desc,
            fontsize=13,
            fontname=FONT,
            color=C["white"],
            align=0
        )

    return y + card_h + 20

def draw_numbered_item(page, x, y, num, title, content, solution=None):
    """Item numerado con formato mejorado."""
    # Número y título
    page.insert_text(
        (x, y),
        f"{num}.",
        fontsize=22,
        fontname=FONT,
        color=C["primary"]
    )

    page.insert_text(
        (x + 35, y),
        title,
        fontsize=22,
        fontname=FONT,
        color=C["white"]
    )

    y += 35

    # Contenido
    page.insert_text(
        (x + 35, y),
        content,
        fontsize=14,
        fontname=FONT,
        color=C["gray"]
    )

    y += 25

    # Solución
    if solution:
        page.insert_text(
            (x + 35, y),
            f"→ {solution}",
            fontsize=14,
            fontname=FONT,
            color=C["primary"]
        )
        y += 35

    return y + 20

def draw_bullet_list(page, x, y, items, color=None, spacing=30):
    """Lista con bullets y espaciado mejorado."""
    if color is None:
        color = C["white"]

    for item in items:
        page.insert_text(
            (x, y),
            "•",
            fontsize=14,
            fontname=FONT,
            color=C["primary"]
        )
        page.insert_text(
            (x + 20, y),
            item,
            fontsize=14,
            fontname=FONT,
            color=color
        )
        y += spacing

    return y

def draw_two_columns(page, y, left_title, left_items, right_title, right_items, left_color=C["red"], right_color=C["primary"]):
    """Layout de dos columnas."""
    w = page.rect.width
    col_w = (w - 3 * MARGIN) / 2

    # Columna izquierda
    draw_card_overlay(page, MARGIN, y, col_w, 350, 0.93)
    page.insert_text((MARGIN + 20, y + 35), left_title, fontsize=13, fontname=FONT, color=left_color)

    ly = y + 70
    for title, desc in left_items:
        page.insert_text((MARGIN + 20, ly), title, fontsize=16, fontname=FONT, color=C["white"])
        ly += 25
        page.insert_text((MARGIN + 20, ly), desc, fontsize=12, fontname=FONT, color=C["gray"])
        ly += 45

    # Columna derecha
    col2_x = MARGIN + col_w + MARGIN
    draw_card_overlay(page, col2_x, y, col_w, 350, 0.93)
    page.insert_text((col2_x + 20, y + 35), right_title, fontsize=13, fontname=FONT, color=right_color)

    ry = y + 70
    for title, desc in right_items:
        page.insert_text((col2_x + 20, ry), title, fontsize=16, fontname=FONT, color=C["white"])
        ry += 25
        page.insert_text((col2_x + 20, ry), desc, fontsize=12, fontname=FONT, color=C["gray"])
        ry += 45

    return y + 370

# ═══════════════════════════════════════════════════════════════════════════════
# SLIDES
# ═══════════════════════════════════════════════════════════════════════════════

def slide_cover(page):
    """Slide 1: Portada de Alto Impacto."""
    w, h = page.rect.width, page.rect.height
    draw_overlay(page, page.rect, 0.4) # Oscurecer un poco el fondo original
    
    # Línea decorativa superior
    draw_decoration_line(page, MARGIN, 100, 200)

    # Título Principal - Copywriting Agresivo
    page.insert_text((MARGIN, h/2 + 20), "Desbloqueamos el valor latente", fontsize=52, fontname=FONT_BOLD, color=C["white"])
    page.insert_text((MARGIN, h/2 + 85), "de la flota vehicular privada.", fontsize=52, fontname=FONT_BOLD, color=C["primary"])
    
    # Tagline
    page.insert_text((MARGIN, h/2 + 150), "AutoRenta: The Trust Layer for the Mobility Economy in LatAm.", fontsize=22, fontname=FONT, color=C["accent"])

    # Badge de Ubicación
    draw_card_overlay(page, w - 300, h - 120, 220, 60, 0.8, C["primary"])
    page.insert_text((w - 280, h - 85), "SERIES PRE-SEED", fontsize=14, fontname=FONT_BOLD, color=C["white"])

def slide_hook(page):
    """Slide 2: El Gancho Financiero."""
    draw_overlay(page, page.rect, 0.95)
    draw_ghost_number(page, "01")
    
    y = draw_title_block(page, 80, "Tu auto es un activo, no un gasto.", "Eliminamos el 'Idle Time' del capital vehicular.")

    y += 40
    draw_section_header(page, MARGIN, y, "EL CAMBIO DE PARADIGMA")
    
    y += 50
    points = [
        ("Eficiencia de Capital", "Un auto promedio está estacionado el 92% del tiempo."),
        ("Yield Generativo", "Genera retornos de doble dígito sobre el valor del activo."),
        ("Operación Manos Libres", "Verificación, cobro y logística 100% automatizada."),
    ]
    
    for title, desc in points:
        page.insert_text((MARGIN, y), title, fontsize=24, fontname=FONT_BOLD, color=C["white"])
        page.insert_text((MARGIN, y + 30), desc, fontsize=16, fontname=FONT, color=C["gray"])
        y += 80

def slide_problema(page):
    """Slide 3: El Problema (The Pain)."""
    draw_overlay(page, page.rect, 0.92)
    draw_ghost_number(page, "02")
    
    y = draw_title_block(page, 80, "LatAm: Un mercado roto por la desconfianza.", "Tres barreras sistémicas que impiden el progreso.")

    # Columnas de Problema
    col_w = (page.rect.width - 3*MARGIN) / 3
    x = MARGIN
    y += 40
    
    problems = [
        ("EXCLUSIÓN", "FINANCIERA", "El 70% no tiene tarjetas con cupos para depósitos de USD 2k."),
        ("VACÍO DE", "CONFIANZA", "El miedo al fraude paraliza el intercambio entre particulares."),
        ("EROSIÓN", "MONETARIA", "Los precios fijos en moneda local son insostenibles."),
    ]
    
    for t1, t2, desc in problems:
        draw_card_overlay(page, x, y, col_w - 20, 300, 0.9)
        page.insert_text((x + 20, y + 50), t1, fontsize=18, fontname=FONT_BOLD, color=C["red"])
        page.insert_text((x + 20, y + 80), t2, fontsize=18, fontname=FONT_BOLD, color=C["red"])
        page.insert_textbox(fitz.Rect(x+20, y+120, x+col_w-40, y+280), desc, fontsize=14, fontname=FONT, color=C["gray"])
        x += col_w

def slide_solucion(page):
    """Slide 4: La Solución (The Infrastructure)."""
    draw_overlay(page, page.rect, 0.92)
    draw_ghost_number(page, "03")
    
    y = draw_title_block(page, 80, "AutoRenta Trust Engine", "Infraestructura propietaria para habilitar la confianza.")

    # Grid de Soluciones
    y += 40
    solutions = [
        ("Smart Ledger", "Sistema de doble entrada con escrow digital.", 0.85),
        ("Biometric Gate", "KYC de grado bancario obligatorio.", 0.95),
        ("Dynamic Pricing", "Algoritmos que protegen el yield en tiempo real.", 0.90),
    ]
    
    x = MARGIN
    for title, desc, progress in solutions:
        draw_card_overlay(page, x, y, 320, 180, 0.95)
        page.insert_text((x + 20, y + 40), title, fontsize=20, fontname=FONT_BOLD, color=C["primary"])
        page.insert_textbox(fitz.Rect(x+20, y+60, x+300, y+140), desc, fontsize=14, fontname=FONT, color=C["gray"])
        draw_progress_bar(page, x + 20, y + 150, 280, progress, "Implementación", f"{int(progress*100)}%")
        x += 350

def slide_producto(page):
    """Slide 5: Producto - usa fondo 5 (entrega de llaves)."""
    draw_overlay(page, fitz.Rect(0, 0, page.rect.width, page.rect.height), 0.85)

    y = draw_title_block(page, 50, "Producto (Flujo 100% Digital)", "Del registro a la devolución sin fricción.")

    # Flow horizontal
    y += 40
    steps = [
        ("1. REGISTRO", "Biometría + licencia"),
        ("2. BÚSQUEDA", "Mapa + filtros"),
        ("3. RESERVA", "Pre-auth + pagos"),
        ("4. CHECK-IN", "Video IA"),
        ("5. USO", "Soporte 24/7"),
        ("6. CHECK-OUT", "Liberación"),
    ]

    x = MARGIN
    step_w = 180
    for title, desc in steps:
        draw_card_overlay(page, x, y, step_w - 15, 90, 0.93)
        page.insert_text((x + 15, y + 35), title, fontsize=11, fontname=FONT, color=C["accent"])
        page.insert_text((x + 15, y + 60), desc, fontsize=12, fontname=FONT, color=C["white"])
        x += step_w

def slide_mercado(page):
    """Slide 6: Mercado (TAM/SAM/SOM)."""
    draw_overlay(page, page.rect, 0.90)
    draw_ghost_number(page, "05")
    
    y = draw_title_block(page, 80, "Un mercado de USD 12B listo para disrupción.", "La ineficiencia de las rentadoras tradicionales es nuestra oportunidad.")

    y += 50
    # Gráfico de Barras Horizontal (Simulado)
    metrics = [
        ("TAM: Car Rental LatAm 2026", 1.0, "USD 12.5B"),
        ("SAM: Peer-to-Peer Mobility", 0.6, "USD 7.2B"),
        ("SOM: Target Initial Captivity", 0.15, "USD 1.1B"),
    ]
    
    for label, progress, val in metrics:
        draw_progress_bar(page, MARGIN, y, 800, progress, label, val)
        y += 80

def slide_wallet(page):
    """Slide 7: Fintech Layer."""
    draw_overlay(page, page.rect, 0.94)
    draw_ghost_number(page, "06")
    
    y = draw_title_block(page, 80, "The Fintech Moat", "No somos una App, somos un Ledger de Movilidad.")

    draw_card_overlay(page, MARGIN, y + 20, 1000, 350, 0.96, C["primary"])
    
    items = [
        ("Atomic Transactions", "Garantizamos el flujo de fondos entre partes sin fricción bancaria."),
        ("Advisory Locks", "Controlamos el riesgo mediante bloqueos transaccionales inteligentes."),
        ("Scalable Edge", "Arquitectura distribuida para latencia cero en LatAm."),
    ]
    
    by = y + 70
    for title, desc in items:
        page.insert_text((MARGIN + 40, by), "• " + title, fontsize=22, fontname=FONT_BOLD, color=C["white"])
        page.insert_text((MARGIN + 65, by + 30), desc, fontsize=16, fontname=FONT, color=C["gray"])
        by += 90

def slide_trust(page):
    """Slide 9: Trust OS - usa fondo 9 (biometría)."""
    draw_overlay(page, fitz.Rect(0, 0, page.rect.width, page.rect.height), 0.80)

    y = draw_title_block(page, 50, "Trust OS (Sistema de Confianza)", "Verificación biométrica + evidencia vinculante.")

    y += 40
    # Métricas de validación
    metrics = [
        ("300+", "Demand Pressure (Waitlist)", "Usuarios orgánicos solicitando acceso."),
        ("45%", "Filter Efficiency (KYC)", "Usuarios que superan el Hard Gate biométrico."),
        ("55%", "Risk Rejection Rate", "Usuarios bloqueados preventivamente."),
        ("< 150ms", "Transaction Latency", "Tiempo de respuesta del Ledger."),
    ]

    for value, label, desc in metrics:
        y = draw_metric_large(page, MARGIN, y, value, label, desc)

def slide_gtm(page):
    """Slide 10: Go-to-Market - usa fondo 10 (Buenos Aires)."""
    draw_overlay(page, fitz.Rect(0, 0, page.rect.width, 450), 0.90)

    y = draw_title_block(page, 50, "Go-to-Market Strategy", "Foco inicial: Argentina + Comunidades Digitales.")

    y += 30
    draw_two_columns(
        page, y,
        "CANALES ACTIVOS (HOY)",
        [
            ("5,000+ Contactos Directos", "Waitlist orgánica con alta intención."),
            ("30+ Comunidades Activas", "WhatsApp/Facebook con engagement."),
            ("Alianzas Estratégicas", "Flotas locales y universidades."),
        ],
        "EJECUCIÓN INICIAL (Q1-Q2)",
        [
            ("Foco Geográfico", "Argentina (CABA/GBA)."),
            ("Estrategia 'Land & Expand'", "Via comunidades digitales."),
            ("CAC Objetivo", "< USD 15 por usuario verificado."),
        ],
        C["accent"],
        C["secondary"]
    )

def slide_failure_modes(page):
    """Slide 14: Failure Modes - usa fondo 14 (São Paulo)."""
    draw_overlay(page, fitz.Rect(0, 0, page.rect.width, page.rect.height), 0.90)

    y = draw_title_block(page, 50, "Market Failure Modes · Design Requirements", "Aprendizaje de los pioneros en LatAm.")

    y += 30
    draw_two_columns(
        page, y,
        "FAILURE MODES (BRAZIL CASE STUDY)",
        [
            ("1. Access Constraint", "Dependencia de tarjetas de crédito."),
            ("2. Runway Constraint", "Alto burn-rate sin densidad."),
            ("3. Ops Constraint", "Verificación manual y costos altos."),
        ],
        "REQUISITOS DE DISEÑO AUTORENTA",
        [
            ("1. Inclusión Financiera", "Wallet propia + FGO desbloquea demanda."),
            ("2. Rentabilidad Unitaria", "MC positivo desde reserva #1."),
            ("3. Trust OS Automatizado", "Costo marginal ~0 por verificación."),
        ],
        C["red"],
        C["primary"]
    )

def slide_unit_economics(page):
    """Slide: The Equation of Growth."""
    draw_overlay(page, page.rect, 0.97)
    draw_ghost_number(page, "07")
    
    y = draw_title_block(page, 80, "Unit Economics: Positive from Day 1", "Estructura de rentabilidad por reserva (Target).")

    # Layout de Tabla Premium
    y += 40
    headers = ["CONCEPTO", "VALOR", "MARGEN %"]
    x_pos = [MARGIN, MARGIN + 400, MARGIN + 700]
    
    # Header row
    for x, txt in zip(x_pos, headers):
        page.insert_text((x, y), txt, fontsize=14, fontname=FONT_BOLD, color=C["muted"])
    
    draw_decoration_line(page, MARGIN, y + 15, 900)
    
    y += 50
    data = [
        ("Average Order Value (4 days)", "USD 160.00", "100%"),
        ("Platform Take Rate", "USD 24.00", "15%"),
        ("Insurance & Risk Pool", "- USD 6.40", "- 4%"),
        ("PSP & Ops Costs", "- USD 4.80", "- 3%"),
    ]
    
    for label, val, perc in data:
        color = C["red"] if "-" in val else C["white"]
        page.insert_text((x_pos[0], y), label, fontsize=18, fontname=FONT, color=C["white"])
        page.insert_text((x_pos[1], y), val, fontsize=18, fontname=FONT_BOLD, color=color)
        page.insert_text((x_pos[2], y), perc, fontsize=18, fontname=FONT, color=C["gray"])
        y += 50
    
    # Final Result
    draw_card_overlay(page, MARGIN, y + 20, 900, 80, 0.95, C["primary"])
    page.insert_text((MARGIN + 40, y + 70), "CONTRIBUTION MARGIN PER BOOKING:", fontsize=22, fontname=FONT_BOLD, color=C["white"])
    page.insert_text((MARGIN + 650, y + 70), "USD 12.80", fontsize=28, fontname=FONT_BOLD, color=C["accent"])

def slide_ask(page):
    """Slide final: The Ask - fondo oscuro."""
    shape = page.new_shape()
    shape.draw_rect(page.rect)
    shape.finish(fill=C["bg"])
    shape.commit()

    y = draw_title_block(page, 50, "Oportunidad de Inversión", "Capital para escalar infraestructura y liquidez.", overlay=False)

    # Tagline
    y += 20
    page.insert_text(
        (page.rect.width/2 - 280, y),
        "18 meses de autonomía para escalar a 100k+ usuarios.",
        fontsize=18,
        fontname=FONT,
        color=C["accent"]
    )

    y += 50
    w = page.rect.width
    col_w = (w - 3*MARGIN) / 2

    # Columna izquierda - Ronda
    draw_card_overlay(page, MARGIN, y, col_w, 320, 0.95)
    page.insert_text((MARGIN + 25, y + 40), "RONDA SEMILLA: USD 500k", fontsize=20, fontname=FONT, color=C["white"])

    bullets = [
        "• Runway: 18 meses.",
        "• Objetivo: 100k+ Usuarios.",
        "",
        "USO DE FONDOS:",
        "• 50% Ingeniería (Escala Supabase + IA).",
        "• 30% Liquidez y Seguro (Fondo P2P).",
        "• 20% Growth (Nodos WiFi)."
    ]
    by = y + 80
    for b in bullets:
        color = C["accent"] if "USO" in b else C["gray"]
        page.insert_text((MARGIN + 25, by), b, fontsize=14, fontname=FONT, color=color)
        by += 28

    # Columna derecha - Growth
    col2_x = MARGIN + col_w + MARGIN
    draw_card_overlay(page, col2_x, y, col_w, 320, 0.95)
    page.insert_text((col2_x + 25, y + 40), "ESTRATEGIA FRONTERA", fontsize=18, fontname=FONT, color=C["white"])

    sections = [
        ("PROBLEMA:", "CAC vía Ads es caro (> USD 15)."),
        ("SOLUCIÓN:", "WiFi gratis en pasos fronterizos."),
        ("RESULTADO:", "100k+ perfiles pre-verificados."),
    ]
    by = y + 80
    for title, desc in sections:
        page.insert_text((col2_x + 25, by), title, fontsize=12, fontname=FONT, color=C["accent"])
        by += 22
        page.insert_text((col2_x + 25, by), desc, fontsize=14, fontname=FONT, color=C["gray"])
        by += 40

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = Path(f"/mnt/storage/Downloads/AutoRentar-PitchDeck-V17-Premium-{timestamp}.pdf")

    print("=" * 65)
    print("   AutoRentar Pitch Deck V17 - Premium Edition")
    print("=" * 65)
    print()

    # Validar fondo
    if not BACKGROUNDS_PDF.exists():
        print(f"   [!] ERROR: No se encuentra el archivo de fondos en:")
        print(f"       {BACKGROUNDS_PDF}")
        sys.exit(1)

    # Abrir PDF de fondos
    bg_doc = fitz.open(str(BACKGROUNDS_PDF))
    print(f"   Fondos cargados: {len(bg_doc)} páginas")

    # Crear nuevo documento
    doc = fitz.open()

    # Mapeo de slides a fondos y funciones
    slides = [
        (0, "Portada", slide_cover),                    # Fondo 1: familia
        (1, "El Gancho", slide_hook),                   # Fondo 2: blanco (oscurecemos)
        (2, "El Problema", slide_problema),             # Fondo 3: mujer con auto
        (3, "La Solución", slide_solucion),             # Fondo 4: hombre con locker
        (4, "Producto", slide_producto),                # Fondo 5: entrega llaves
        (5, "Mercado", slide_mercado),                  # Fondo 6: mapa LatAm
        (6, "Fintech", slide_wallet),                   # Fondo 7: wallet app
        (7, "App Marketplace", None),                   # Fondo 8: mapa BA - solo imagen
        (8, "Trust OS", slide_trust),                   # Fondo 9: biometría
        (9, "Go-to-Market", slide_gtm),                 # Fondo 10: Buenos Aires
        (10, "Unit Economics", slide_unit_economics),   # Fondo 11: blanco (oscurecemos)
        (13, "Failure Modes", slide_failure_modes),     # Fondo 14: São Paulo
        (10, "The Ask", slide_ask),                     # Fondo 11: blanco (oscurecemos)
    ]

    print(f"   Generando {len(slides)} slides...")
    print()

    for i, (bg_idx, name, func) in enumerate(slides, 1):
        # Copiar página del PDF de fondos
        if bg_idx < len(bg_doc):
            doc.insert_pdf(bg_doc, from_page=bg_idx, to_page=bg_idx)
            page = doc[-1]
        else:
            # Crear página en blanco si no hay fondo
            page = doc.new_page(width=1280, height=720)

        # Aplicar contenido
        if func:
            print(f"   [{i:02d}/{len(slides)}] {name}")
            func(page)
        else:
            print(f"   [{i:02d}/{len(slides)}] {name} (solo fondo)")

    bg_doc.close()

    # Guardar
    print()
    doc.save(str(output_path), garbage=4, deflate=True)
    doc.close()

    print("-" * 65)
    print(f"   PDF guardado: {output_path}")
    print("-" * 65)
    print()
    
    if AUTO_OPEN:
        print(f"   Abriendo archivo en Linux...")
        try:
            subprocess.Popen(["xdg-open", str(output_path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            print(f"   [!] No se pudo abrir automáticamente: {e}")

    print("   Mejoras aplicadas:")
    print("     ✓ Apertura automática (Linux/xdg-open)")
    print("     ✓ Validación de fondos")
    print("     ✓ Compresión de PDF optimizada")
    print("     ✓ Tipografía y overlays premium")
    print()

if __name__ == "__main__":
    main()
