#!/usr/bin/env python3
"""
AutoRentar Pitch Deck V16 - Complete Rebuild
Genera un pitch deck limpio con colores consistentes y layouts correctos.
"""

import fitz  # PyMuPDF
from pathlib import Path
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# PALETA DE COLORES OFICIAL
# ═══════════════════════════════════════════════════════════════════════════════

def hex_to_rgb(hex_color: str) -> tuple:
    """Convierte hex a tuple RGB normalizado (0-1)."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4))

C = {
    # Verde Principal (Brand)
    "primary": hex_to_rgb("#22C55E"),
    "primary_light": hex_to_rgb("#4ADE80"),
    "primary_dark": hex_to_rgb("#16A34A"),

    # Acentos
    "lime": hex_to_rgb("#D4ED31"),
    "cyan": hex_to_rgb("#2DD4BF"),

    # Fondos
    "bg": hex_to_rgb("#0F172A"),
    "card": hex_to_rgb("#1E293B"),
    "elevated": hex_to_rgb("#334155"),

    # Texto
    "white": hex_to_rgb("#FFFFFF"),
    "gray": hex_to_rgb("#94A3B8"),
    "muted": hex_to_rgb("#64748B"),

    # Semánticos
    "red": hex_to_rgb("#EF4444"),
    "blue": hex_to_rgb("#3B82F6"),
    "orange": hex_to_rgb("#F59E0B"),
}

# Dimensiones slide (16:9)
WIDTH = 1280
HEIGHT = 720

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def new_slide(doc):
    """Crea una nueva página con fondo oscuro."""
    page = doc.new_page(width=WIDTH, height=HEIGHT)
    shape = page.new_shape()
    shape.draw_rect(page.rect)
    shape.finish(fill=C["bg"])
    shape.commit()
    return page

def draw_title(page, title, subtitle=None, y=60):
    """Dibuja título principal y subtítulo."""
    page.insert_text((60, y), title, fontsize=36, fontname="helv", color=C["white"])
    if subtitle:
        page.insert_text((60, y + 35), subtitle, fontsize=14, color=C["lime"])
    return y + 80

def draw_section_label(page, x, y, text):
    """Label de sección en verde lima uppercase."""
    page.insert_text((x, y), text.upper(), fontsize=11, fontname="helv", color=C["lime"])

def draw_card(page, x, y, w, h, border_color=None):
    """Dibuja card con fondo oscuro."""
    rect = fitz.Rect(x, y, x + w, y + h)
    shape = page.new_shape()
    shape.draw_rect(rect)
    if border_color:
        shape.finish(fill=C["card"], color=border_color, width=1)
    else:
        shape.finish(fill=C["card"])
    shape.commit()
    return rect

def draw_metric(page, x, y, label, value, desc=None, value_color=None):
    """Dibuja una métrica con label, valor grande y descripción."""
    if value_color is None:
        value_color = C["primary"]

    # Card background
    draw_card(page, x, y, 280, 90)

    # Label pequeño
    page.insert_text((x + 16, y + 24), label, fontsize=10, color=C["gray"])

    # Valor grande
    page.insert_text((x + 16, y + 58), value, fontsize=28, fontname="helv", color=value_color)

    # Descripción al lado
    if desc:
        page.insert_text((x + 310, y + 45), desc, fontsize=11, color=C["gray"])

def draw_bullet_list(page, x, y, items, color=None):
    """Dibuja lista con bullets."""
    if color is None:
        color = C["white"]
    for item in items:
        page.insert_text((x, y), f"• {item}", fontsize=12, color=color)
        y += 25
    return y

def draw_numbered_section(page, x, y, number, title, content, solution=None):
    """Dibuja sección numerada con problema y solución."""
    # Número y título
    page.insert_text((x, y), f"{number}. {title}", fontsize=18, fontname="helv", color=C["white"])
    y += 28

    # Contenido
    page.insert_text((x, y), content, fontsize=12, color=C["gray"])
    y += 22

    # Solución en verde
    if solution:
        page.insert_text((x, y), f"SOLUCIÓN: {solution}", fontsize=12, color=C["primary"])
        y += 30

    return y + 15

# ═══════════════════════════════════════════════════════════════════════════════
# SLIDES
# ═══════════════════════════════════════════════════════════════════════════════

def slide_cover(doc):
    """Slide 1: Portada."""
    page = new_slide(doc)

    # Título centrado
    page.insert_text(
        (WIDTH//2 - 350, HEIGHT//2 - 40),
        "Convertimos autos ociosos en ingresos",
        fontsize=40, fontname="helv", color=C["white"]
    )
    page.insert_text(
        (WIDTH//2 - 200, HEIGHT//2 + 10),
        "seguros para sus dueños",
        fontsize=40, fontname="helv", color=C["white"]
    )

    # Subtítulo
    page.insert_text(
        (WIDTH//2 - 120, HEIGHT//2 + 70),
        "AutoRentar | Argentina | 2026",
        fontsize=14, color=C["gray"]
    )

    # Logo placeholder
    draw_card(page, WIDTH//2 - 100, HEIGHT - 120, 200, 50, C["primary"])
    page.insert_text((WIDTH//2 - 70, HEIGHT - 88), "AUTORENTAR", fontsize=20, fontname="helv", color=C["white"])

def slide_hook(doc):
    """Slide 2: El Gancho."""
    page = new_slide(doc)

    # Contenido izquierdo
    draw_section_label(page, 60, 80, "EL GANCHO")
    page.insert_text((60, 130), "El auto trabaja para vos, sin", fontsize=36, fontname="helv", color=C["white"])
    page.insert_text((60, 175), "perder el control.", fontsize=36, fontname="helv", color=C["white"])

    page.insert_text((60, 230), "Publicas en minutos, definís disponibilidad y cobras automático.", fontsize=13, color=C["gray"])
    page.insert_text((60, 250), "Nosotros gestionamos verificación, pagos y soporte.", fontsize=13, color=C["gray"])

    y = 300
    bullets = [
        "Ingresos extra reales con tu mismo auto.",
        "Riesgo reducido con preautorización + FGO.",
        "Todo 100% digital y transparente."
    ]
    draw_bullet_list(page, 60, y, bullets, C["gray"])

    # Card derecha
    draw_card(page, 750, 160, 450, 140, C["elevated"])
    draw_section_label(page, 770, 195, "PRUEBA DE EJECUCIÓN")
    page.insert_text((770, 230), "EcuCondor valida que sabemos operar, cobrar y", fontsize=13, color=C["white"])
    page.insert_text((770, 250), "escalar.", fontsize=13, color=C["white"])

def slide_problema(doc):
    """Slide 3: El Problema."""
    page = new_slide(doc)
    y = draw_title(page, "El Problema: 3 Barreras Reales", "Por qué no existe un 'Turo' real en LatAm hoy.")

    y = draw_numbered_section(page, 60, y + 20, "1", "Barrera Financiera (Acceso)",
        "La mayoría no tiene tarjetas con cupos altos (>USD 1500).",
        "Wallet propietaria + Pre-auth fraccionada.")

    y = draw_numbered_section(page, 60, y, "2", "Barrera de Confianza (Miedo)",
        "El dueño teme al fraude, robos o daños sin culpables.",
        "Identidad verificada y arbitraje con pruebas.")

    y = draw_numbered_section(page, 60, y, "3", "Barrera de Rentabilidad (Dinero)",
        "Precios estáticos en inflación = Pérdida.",
        "Pricing dinámico basado en demanda.")

def slide_solucion(doc):
    """Slide 4: La Solución."""
    page = new_slide(doc)
    y = draw_title(page, "La Solución: Infraestructura Vertical", "Más que un marketplace: un Sistema Operativo.")

    y = draw_numbered_section(page, 60, y + 20, "1", "Motor de Pagos y Garantías",
        "Ledger de doble entrada. Split payments automático.\nGestión de depósitos y garantías (Escrow lógico).")

    y = draw_numbered_section(page, 60, y, "2", "Trust OS (Sistema de Confianza)",
        "KYC Biométrico 'Hard Gate' obligatorio.\nInspección de video 360° + Detección de daños por IA.")

    y = draw_numbered_section(page, 60, y, "3", "Legal-Tech Engine",
        "Contratos de comodato digitales firmados al instante.\nEvidencia vinculante para resolución de disputas.")

def slide_timing(doc):
    """Slide 5: Por Qué Ahora."""
    page = new_slide(doc)
    y = draw_title(page, "Por Qué Ahora (Timing)", "La convergencia de 3 factores macro en LatAm.")

    sections = [
        ("Inflación & Estacionalidad", "La volatilidad de precios hace indispensable el Pricing Dinámico\npara proteger el valor del activo."),
        ("Exclusión Financiera", "El mercado exige soluciones de movilidad que no dependan\nde tarjetas de crédito bancarias tradicionales."),
        ("Riesgo del Activo", "La tecnología de video y biometría es accesible y barata\npara mitigar el riesgo de fraude masivamente."),
    ]

    y += 20
    for title, desc in sections:
        page.insert_text((60, y), title, fontsize=20, fontname="helv", color=C["white"])
        y += 30
        for line in desc.split('\n'):
            page.insert_text((60, y), line, fontsize=12, color=C["gray"])
            y += 18
        y += 25

def slide_mercado(doc):
    """Slide 7: TAM/SAM/SOM."""
    page = new_slide(doc)

    # Header con card
    draw_card(page, 60, 50, 700, 100)
    page.insert_text((80, 95), "Mercado (TAM / SAM / SOM)", fontsize=28, fontname="helv", color=C["white"])
    page.insert_text((80, 125), "Oportunidad real en Argentina con expansión LATAM.", fontsize=13, color=C["gray"])

    # Métricas izquierda
    y = 190
    metrics = [
        ("TAM ARGENTINA (CAR RENTALS 2025)", "USD 989M", C["lime"]),
        ("SAM ARGENTINA (CAR-SHARING 2025)", "USD 12.4M", C["lime"]),
        ("SOM 24-36 MESES (INGRESOS PLATAFORMA)", "USD 0.8-1.1M", C["lime"]),
    ]

    for label, value, color in metrics:
        draw_card(page, 60, y, 420, 90)
        page.insert_text((80, y + 35), value, fontsize=32, fontname="helv", color=color)
        page.insert_text((80, y + 60), label, fontsize=9, color=C["gray"])
        y += 110

    # Foco inicial derecha
    draw_card(page, 520, 190, 700, 300, C["elevated"])
    draw_section_label(page, 540, 225, "FOCO INICIAL")

    bullets = [
        "Argentina: alta informalidad + activos subutilizados.",
        "BA + CABA: 8.44M vehículos activos (DNRPA).",
        "LATAM car-sharing crece 22.7% CAGR 2024-2030.",
        "Viento de cola macro: clase media busca ingresos extra en 2026."
    ]
    draw_bullet_list(page, 540, 260, bullets)

    # Footer
    page.insert_text((60, 680), "Fuentes: Estimaciones internas basadas en datos de renting LATAM (2024) y supuestos de conversión del mercado informal.", fontsize=9, color=C["muted"])

def slide_failure_modes(doc):
    """Slide 8: Market Failure Modes."""
    page = new_slide(doc)
    y = draw_title(page, "Market Failure Modes · Design Requirements", "Aprendizaje de los pioneros en LatAm para asegurar escala.")

    # Dos columnas
    col1_x = 60
    col2_x = 660

    # Columna izquierda - Failures (rojo)
    draw_section_label(page, col1_x, y + 10, "FAILURE MODES (BRAZIL CASE STUDY)")
    page.insert_text((col1_x, y + 10), "FAILURE MODES (BRAZIL CASE STUDY)", fontsize=11, fontname="helv", color=C["red"])

    failures = [
        ("1. Access Constraint (Acceso)", "Dependencia de tarjetas de crédito con cupo alto.\nLimitó el TAM real a solo la población bancarizada."),
        ("2. Runway Constraint (Caja)", "Modelo de alto burn-rate esperando liquidez orgánica.\nCierres por falta de capital antes de lograr densidad."),
        ("3. Ops Constraint (Operación)", "Verificación manual y disputas subjetivas.\nUnit Economics negativos por costo de soporte humano."),
    ]

    fy = y + 50
    for title, desc in failures:
        page.insert_text((col1_x, fy), title, fontsize=16, fontname="helv", color=C["white"])
        fy += 25
        for line in desc.split('\n'):
            page.insert_text((col1_x, fy), line, fontsize=11, color=C["gray"])
            fy += 16
        fy += 20

    # Columna derecha - Solutions (verde)
    page.insert_text((col2_x, y + 10), "REQUISITOS DE DISEÑO AUTORENTA", fontsize=11, fontname="helv", color=C["primary"])

    solutions = [
        ("1. Inclusión Financiera", "Wallet propia + FGO (Fondo de Garantía Operativa).\nDesbloquea demanda masiva sin riesgo crediticio."),
        ("2. Rentabilidad Unitaria", "Modelo diseñado para MC positivo desde reserva #1.\nCrecimiento orgánico eficiente y escalable."),
        ("3. Trust OS Automatizado", "Biometría + Evidencia Video + IA.\nSoporte y riesgo automatizado (Costo marginal ~0)."),
    ]

    sy = y + 50
    for title, desc in solutions:
        page.insert_text((col2_x, sy), title, fontsize=16, fontname="helv", color=C["white"])
        sy += 25
        for line in desc.split('\n'):
            page.insert_text((col2_x, sy), line, fontsize=11, color=C["gray"])
            sy += 16
        sy += 20

def slide_unit_economics(doc):
    """Slide 9: The Equation."""
    page = new_slide(doc)
    y = draw_title(page, "The Equation (Target Economics)", "Modelo matemático de viabilidad por unidad (First Principles).")

    # Fórmula
    page.insert_text((60, y + 10), "CONTRIBUTION MARGIN = (AOV x TAKE RATE) - COSTS - RISK", fontsize=14, fontname="helv", color=C["primary"])

    # Tabla de valores
    rows = [
        ("AOV (Ticket Objetivo)", "USD 120.00", "Alquiler promedio 3-4 días (Benchmark).", C["white"]),
        ("Take Rate (15%)", "USD 18.00", "Revenue Plataforma.", C["primary"]),
        ("FGO (10%)", "USD 12.00", "Fondo de Garantía (Pasivo/Pool).", C["white"]),
        ("Costos PSP & Soporte", "- USD 7.20", "Pagos (3.5%) + Riesgo Est. (2.5%).", C["red"]),
    ]

    y += 60
    for label, value, desc, vcolor in rows:
        page.insert_text((60, y), label, fontsize=14, color=C["white"])
        page.insert_text((320, y), value, fontsize=14, fontname="helv", color=vcolor)
        page.insert_text((480, y), desc, fontsize=11, color=C["gray"])
        y += 45

    # Resultado
    y += 20
    page.insert_text((180, y), "TARGET MARGIN: USD 10.80 por reserva (Positivo desde Day 1).", fontsize=16, fontname="helv", color=C["primary"])

    # Notas
    y += 60
    draw_section_label(page, 60, y, "CÓMO EL 'TRUST OS' PROTEGE EL MARGEN:")
    y += 30
    notes = [
        "Wallet Pre-Funded: Elimina el riesgo de impago (Payment Gap = 0).",
        "Video Check-in: Reduce disputas subjetivas (Risk Cost baja 40%).",
        "Hard Gate KYC: Bloquea identidad sintética antes de reservar.",
    ]
    draw_bullet_list(page, 60, y, notes)

def slide_risk_policy(doc):
    """Slide 10: Risk Policy."""
    page = new_slide(doc)
    y = draw_title(page, "Risk Policy & Coverage (Trust OS)", "Reglas claras: qué cubre el FGO y cómo gestionamos excepciones.")

    sections = [
        ("1. FGO (Fondo Garantía Operativa)",
         "Cubre: Daños menores (< USD 500), franquicias de seguro y lucro cesante.\nFinanciado por: 10% de cada reserva + Aportes de Owners (Pool)."),
        ("2. Robo Total & Destrucción",
         "Cubre: Póliza de Seguro Madre (Partner) o Póliza del Owner (endosada).\nEl FGO cubre el deducible para que el owner no pague nada."),
        ("3. Evidencia Vinculante (Video Check-in)",
         "Regla: Sin video de check-out validado, el renter asume responsabilidad total.\nLa evidencia en Blockchain/Server actúa como árbitro final."),
    ]

    y += 20
    for title, desc in sections:
        page.insert_text((60, y), title, fontsize=18, fontname="helv", color=C["primary"])
        y += 30
        for line in desc.split('\n'):
            page.insert_text((60, y), line, fontsize=12, color=C["gray"])
            y += 20
        y += 25

    # Flow diagram
    y += 10
    shape = page.new_shape()
    shape.draw_line((60, y), (1200, y))
    shape.finish(color=C["elevated"], width=2)
    shape.commit()

    y += 25
    page.insert_text((60, y), "INCIDENTE -> EVIDENCIA AI -> FGO PAGA (INSTANTÁNEO) -> RECOBRO AL RENTER (DIFERIDO)", fontsize=12, fontname="helv", color=C["primary"])

def slide_system_validation(doc):
    """Slide 15: System Validation (Alpha Data)."""
    page = new_slide(doc)
    y = draw_title(page, "System Validation (Alpha Data)", "Pruebas de estrés del 'Trust OS' en entorno real.")

    # Métricas con valores en VERDE
    metrics = [
        ("Demand Pressure (Waitlist)", "300+", "Usuarios orgánicos solicitando acceso (Organic Pull)."),
        ("Filter Efficiency (KYC)", "45%", "Tasa de usuarios que superan el 'Hard Gate' biométrico."),
        ("Risk Rejection Rate", "55%", "Usuarios bloqueados preventivamente (Fraude evitado)."),
        ("Transaction Latency", "< 150ms", "Tiempo de respuesta del Ledger en pruebas de carga."),
    ]

    y += 20
    for label, value, desc in metrics:
        draw_card(page, 60, y, 300, 95)
        page.insert_text((80, y + 28), label, fontsize=10, color=C["gray"])
        page.insert_text((80, y + 65), value, fontsize=32, fontname="helv", color=C["primary"])  # VERDE!
        page.insert_text((380, y + 50), desc, fontsize=12, color=C["white"])
        y += 115

    # Footer
    draw_section_label(page, 60, y + 20, "INFRAESTRUCTURA LISTA (LOIs)")
    page.insert_text((60, y + 50), "• Integración KYC/Biometría: COMPLETADA.", fontsize=12, color=C["white"])

def slide_gtm(doc):
    """Slide 14: Go-to-Market."""
    page = new_slide(doc)
    y = draw_title(page, "Go-to-Market Strategy", "Foco inicial: Argentina + Comunidades Digitales.")

    # Dos columnas
    draw_section_label(page, 60, y + 20, "CANALES ACTIVOS (HOY)")
    bullets1 = [
        "5,000+ Contactos Directos (Waitlist)",
        "Alianzas con flotas locales",
        "Canal EcuCondor (Audiencia validada)"
    ]
    draw_bullet_list(page, 60, y + 55, bullets1)

    draw_section_label(page, 660, y + 20, "EJECUCIÓN INICIAL (Q1-Q2)")
    bullets2 = [
        "Foco Geográfico: CABA/GBA",
        "Estrategia: 'Land & Expand' via comunidades",
        "CAC Objetivo: < USD 15"
    ]
    draw_bullet_list(page, 660, y + 55, bullets2)

def slide_master_plan(doc):
    """Slide 20: The Master Plan."""
    page = new_slide(doc)
    y = draw_title(page, "The Master Plan (Execution)", "Estrategia secuencial de despliegue de capital.")

    phases = [
        ("FASE 1: R&D + CORE INFRA", "Construir Trust OS, Wallet y Contratos.\nSTATUS: COMPLETADO (Bootstrap).", C["primary"], True),
        ("FASE 2: ALPHA TEST (VALIDACIÓN)", "Probar el sistema con 50 viajes manuales y Waitlist.\nSTATUS: COMPLETADO (Data obtenida).", C["primary"], True),
        ("FASE 3: LIQUIDITY INJECTION (ESTA RONDA)", "Capitalizar el FGO y subsidiar oferta para lograr densidad.\nOBJETIVO: 18 Meses de Runway -> Series A.", C["blue"], False),
        ("FASE 4: MASS SCALE & AUTONOMY", "Expansión regional y gestión de flotas autónomas.\nVISIÓN: 2027+.", C["muted"], False),
    ]

    y += 20
    for i, (title, desc, color, completed) in enumerate(phases):
        # Línea vertical
        if i < len(phases) - 1:
            shape = page.new_shape()
            shape.draw_line((45, y + 60), (45, y + 100))
            shape.finish(color=C["elevated"], width=3)
            shape.commit()

        # Punto
        shape = page.new_shape()
        shape.draw_circle((45, y + 10), 6)
        shape.finish(fill=color, color=color)
        shape.commit()

        # Título
        page.insert_text((70, y + 15), title, fontsize=16, fontname="helv", color=color)

        # Descripción
        y += 35
        for line in desc.split('\n'):
            page.insert_text((70, y), line, fontsize=12, color=C["white"])
            y += 18

        y += 30

def slide_team(doc):
    """Slide 24: El Equipo."""
    page = new_slide(doc)
    y = draw_title(page, "El Equipo (Founders)", "Ejecución probada en Fintech y Movilidad.")

    # Founder 1
    draw_card(page, 60, y + 40, 120, 120)
    page.insert_text((95, y + 105), "FOTO", fontsize=12, color=C["muted"])

    page.insert_text((200, y + 80), "EDUARDO MARQUES (CEO)", fontsize=20, fontname="helv", color=C["white"])
    page.insert_text((200, y + 110), "Producto & Tecnología (Full-stack). Ex-Fintech.", fontsize=13, color=C["gray"])
    page.insert_text((200, y + 130), "Lideró la arquitectura de EcuCondor (Pagos).", fontsize=13, color=C["gray"])

    # Founder 2
    draw_card(page, 60, y + 200, 120, 120)
    page.insert_text((95, y + 265), "FOTO", fontsize=12, color=C["muted"])

    page.insert_text((200, y + 240), "CHARLES REBOLLO (COO)", fontsize=20, fontname="helv", color=C["white"])
    page.insert_text((200, y + 270), "Operaciones & Flota. Experto en Logística.", fontsize=13, color=C["gray"])
    page.insert_text((200, y + 290), "Gestión de siniestros y redes de talleres.", fontsize=13, color=C["gray"])

def slide_ask(doc):
    """Slide 26: La Ronda."""
    page = new_slide(doc)

    draw_card(page, 60, 50, 700, 100)
    page.insert_text((80, 95), "Oportunidad de Inversión", fontsize=28, fontname="helv", color=C["white"])
    page.insert_text((80, 125), "Capital para escalar infraestructura y liquidez.", fontsize=13, color=C["gray"])

    # Tagline
    page.insert_text((400, 190), "18 meses de autonomía para escalar a 100k+ usuarios.", fontsize=14, fontname="helv", color=C["lime"])

    # Dos columnas
    col1_x = 60
    col2_x = 660
    y = 240

    # Columna izquierda - Ronda
    draw_card(page, col1_x, y, 550, 280)
    page.insert_text((col1_x + 20, y + 35), "RONDA SEMILLA: USD 500k", fontsize=18, fontname="helv", color=C["white"])

    bullets1 = [
        "Runway: 18 meses.",
        "Objetivo: 100k+ Usuarios.",
        "",
        "USO DE FONDOS:",
        "50% Ingeniería (Escala Supabase + IA).",
        "30% Liquidez y Seguro (Fondo P2P).",
        "20% Growth (Nodos WiFi)."
    ]
    by = y + 70
    for b in bullets1:
        if b:
            page.insert_text((col1_x + 20, by), f"• {b}" if not b.endswith(":") else b, fontsize=12, color=C["white"] if "USO" in b else C["gray"])
        by += 22

    # Columna derecha - Growth
    draw_card(page, col2_x, y, 550, 280)
    page.insert_text((col2_x + 20, y + 35), "ESTRATEGIA FRONTERA (Growth Engine)", fontsize=16, fontname="helv", color=C["white"])

    bullets2 = [
        "PROBLEMA:",
        "Captar propietarios vía Ads es caro (CAC > USD 15).",
        "",
        "SOLUCIÓN (HACK):",
        "WiFi Gratis de alta velocidad en pasos fronterizos.",
        "Para conectar: Registro obligatorio de vehículo.",
        "(Marca, Modelo, Año, DNI/Licencia).",
        "",
        "RESULTADO ESPERADO:",
        "100k+ perfiles pre-verificados (Ene-Mar).",
        "Conversión: Activación automática en alta demanda.",
        "CAC proyectado: < USD 0.50 por lead calificado."
    ]
    by = y + 70
    for b in bullets2:
        if b:
            color = C["lime"] if b.endswith(":") else C["gray"]
            page.insert_text((col2_x + 20, by), f"• {b}" if not b.endswith(":") else b, fontsize=11, color=color)
        by += 18

def slide_demo_access(doc):
    """Slide 21: Demo Access."""
    page = new_slide(doc)
    y = draw_title(page, "Acceso Demo Inversor (Sandbox)", "Due diligence técnica habilitada sin riesgo.")

    # Card credenciales
    draw_card(page, 60, y + 30, 450, 180, C["cyan"])
    draw_section_label(page, 85, y + 70, "CREDENCIALES DE ACCESO")
    page.insert_text((85, y + 110), "URL: app.autorentar.com/demo", fontsize=16, color=C["white"])
    page.insert_text((85, y + 145), "User: investor@autorentar.com", fontsize=16, color=C["white"])
    page.insert_text((85, y + 180), "Pass: demo2026", fontsize=16, color=C["white"])

    # Card alcance
    draw_card(page, 560, y + 30, 650, 180)
    page.insert_text((585, y + 60), "▢ QUÉ PUEDES HACER (ALCANCE):", fontsize=12, fontname="helv", color=C["cyan"])
    alcance = [
        "Navegación completa del Marketplace.",
        "Simulación de Reserva (End-to-End).",
        "Visualización de Wallet y Carga de Saldo (Demo).",
        "Acceso a Dashboard de Propietario (Vista Read-Only)."
    ]
    draw_bullet_list(page, 585, y + 90, alcance)

    # Restricciones
    draw_card(page, 560, y + 230, 650, 180)
    page.insert_text((585, y + 260), "▢ RESTRICCIONES DE SEGURIDAD:", fontsize=12, fontname="helv", color=C["red"])
    restricciones = [
        "Pagos reales deshabilitados (Mode Sandbox).",
        "Datos personales anonimizados.",
        "Publicación de vehículos bloqueada.",
        "Sin acceso a contratos legales vinculantes."
    ]
    draw_bullet_list(page, 585, y + 290, restricciones, C["gray"])

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Genera el pitch deck V16 completo."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = Path(f"/mnt/storage/Downloads/AutoRentar-PitchDeck-V16-{timestamp}.pdf")

    print("=" * 60)
    print("  AutoRentar Pitch Deck V16 Generator")
    print("=" * 60)
    print()

    doc = fitz.open()

    slides = [
        ("Cover", slide_cover),
        ("El Gancho", slide_hook),
        ("El Problema", slide_problema),
        ("La Solución", slide_solucion),
        ("Por Qué Ahora", slide_timing),
        ("Mercado TAM/SAM/SOM", slide_mercado),
        ("Failure Modes", slide_failure_modes),
        ("Unit Economics", slide_unit_economics),
        ("Risk Policy", slide_risk_policy),
        ("System Validation", slide_system_validation),
        ("Go-to-Market", slide_gtm),
        ("Master Plan", slide_master_plan),
        ("Demo Access", slide_demo_access),
        ("Team", slide_team),
        ("The Ask", slide_ask),
    ]

    print(f"  Generando {len(slides)} slides...")
    print()

    for i, (name, func) in enumerate(slides, 1):
        print(f"    [{i:02d}/{len(slides)}] {name}")
        func(doc)

    print()
    doc.save(str(output_path))
    doc.close()

    print("-" * 60)
    print(f"  PDF guardado: {output_path}")
    print("-" * 60)
    print()
    print("  Colores consistentes aplicados:")
    print("    - Verde Principal:  #22C55E (métricas, valores positivos)")
    print("    - Verde Lima:       #D4ED31 (labels de sección)")
    print("    - Cyan:             #2DD4BF (cards destacadas)")
    print("    - Rojo:             #EF4444 (costos, errores)")
    print("    - Fondo:            #0F172A")
    print()

if __name__ == "__main__":
    main()
