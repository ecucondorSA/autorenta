#!/usr/bin/env python3
"""
AutoRentar Pitch Deck Color Updater

Actualiza los colores del pitch deck para mantener consistencia
con la identidad visual definida en pitch-deck-tokens.

Uso: python3 scripts/update_pitchdeck_colors.py [--preview]
"""

import fitz  # PyMuPDF
import sys
from pathlib import Path
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# PALETA DE COLORES OFICIAL - PITCH DECK V14
# Extraída del análisis del pitch deck para inversores
# ═══════════════════════════════════════════════════════════════════════════════

def hex_to_rgb(hex_color: str) -> tuple:
    """Convierte hex a tuple RGB normalizado (0-1)."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255 for i in (0, 2, 4))

# Colores del Pitch Deck
COLORS = {
    # Verde Principal (Brand)
    "primary": "#22C55E",
    "primary_light": "#4ADE80",
    "primary_dark": "#16A34A",

    # Acentos
    "accent_lime": "#D4ED31",      # Labels de sección
    "accent_cyan": "#2DD4BF",      # Bordes destacados

    # Fondos
    "bg_dark": "#0F172A",          # Fondo principal
    "bg_card": "#1E293B",          # Cards
    "bg_elevated": "#334155",      # Elementos elevados

    # Texto
    "text_primary": "#FFFFFF",
    "text_secondary": "#94A3B8",
    "text_muted": "#64748B",

    # Semánticos
    "success": "#22C55E",
    "error": "#EF4444",
    "warning": "#F59E0B",
    "info": "#3B82F6",
}

# Convertir a RGB para PyMuPDF
RGB = {k: hex_to_rgb(v) for k, v in COLORS.items()}

# ═══════════════════════════════════════════════════════════════════════════════
# FUNCIONES DE UTILIDAD
# ═══════════════════════════════════════════════════════════════════════════════

def clean_page(page, bg_color=None):
    """Limpia una página con el color de fondo especificado."""
    if bg_color is None:
        bg_color = RGB["bg_dark"]
    shape = page.new_shape()
    shape.draw_rect(page.rect)
    shape.finish(color=bg_color, fill=bg_color)
    shape.commit()


def draw_header(page, title, subtitle=None, y_offset=0):
    """Dibuja header de página con título y subtítulo opcional."""
    y = 50 + y_offset
    page.insert_text(
        (40, y),
        title,
        fontsize=32,
        fontname="helv",
        color=RGB["text_primary"]
    )
    if subtitle:
        page.insert_text(
            (40, y + 30),
            subtitle,
            fontsize=13,
            fontname="helv",
            color=RGB["accent_lime"]
        )


def draw_card(page, rect, title=None, content=None, highlighted=False):
    """Dibuja una card con estilo del pitch deck."""
    shape = page.new_shape()
    shape.draw_rect(rect)

    border_color = RGB["accent_cyan"] if highlighted else RGB["bg_card"]
    shape.finish(
        color=border_color if highlighted else None,
        fill=RGB["bg_card"],
        width=1 if highlighted else 0
    )
    shape.commit()

    if title:
        page.insert_text(
            (rect.x0 + 16, rect.y0 + 28),
            title,
            fontsize=11,
            color=RGB["text_secondary"]
        )

    if content:
        page.insert_text(
            (rect.x0 + 16, rect.y0 + 55),
            content,
            fontsize=22,
            fontname="helv",
            color=RGB["text_primary"]
        )


def draw_metric_card(page, x, y, width, height, label, value, description=None):
    """Dibuja una card de métrica."""
    rect = fitz.Rect(x, y, x + width, y + height)

    # Card background
    shape = page.new_shape()
    shape.draw_rect(rect)
    shape.finish(fill=RGB["bg_card"])
    shape.commit()

    # Label
    page.insert_text(
        (x + 16, y + 24),
        label,
        fontsize=10,
        color=RGB["text_secondary"]
    )

    # Value (grande, verde)
    page.insert_text(
        (x + 16, y + 55),
        value,
        fontsize=26,
        fontname="helv",
        color=RGB["primary"]
    )

    # Description (si existe)
    if description:
        desc_rect = fitz.Rect(x + width + 20, y + 10, x + width + 500, y + height - 10)
        page.insert_textbox(
            desc_rect,
            description,
            fontsize=12,
            color=RGB["text_primary"],
            align=0
        )


def draw_section_label(page, x, y, text):
    """Dibuja un label de sección en verde lima (uppercase)."""
    page.insert_text(
        (x, y),
        text.upper(),
        fontsize=11,
        fontname="helv",
        color=RGB["accent_lime"]
    )


def draw_phase_item(page, x, y, phase_title, description, status_color, is_last=False):
    """Dibuja un item de fase en el timeline."""
    # Título de fase
    page.insert_text(
        (x, y),
        phase_title,
        fontsize=15,
        fontname="helv",
        color=status_color
    )

    # Descripción
    desc_rect = fitz.Rect(x, y + 8, x + 700, y + 60)
    page.insert_textbox(
        desc_rect,
        description,
        fontsize=11,
        color=RGB["text_primary"],
        align=0
    )

    # Línea conectora vertical (si no es el último)
    if not is_last:
        shape = page.new_shape()
        shape.draw_line((x - 20, y + 55), (x - 20, y + 75))
        shape.finish(color=RGB["text_muted"], width=2)
        shape.commit()

        # Punto de conexión
        shape = page.new_shape()
        shape.draw_circle((x - 20, y - 5), 4)
        shape.finish(color=status_color, fill=status_color)
        shape.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# SLIDES ESPECÍFICAS
# ═══════════════════════════════════════════════════════════════════════════════

def update_system_validation_slide(page):
    """Actualiza la slide de System Validation (Alpha Data)."""
    clean_page(page)
    draw_header(page, "System Validation (Alpha Data)", "Pruebas de estrés del 'Trust OS' en entorno real.")

    # Métricas
    metrics = [
        ("Demand Pressure (Waitlist)", "300+", "Usuarios orgánicos solicitando acceso (Organic Pull)."),
        ("Filter Efficiency (KYC)", "45%", "Tasa de usuarios que superan el 'Hard Gate' biométrico."),
        ("Risk Rejection Rate", "55%", "Usuarios bloqueados preventivamente (Fraude evitado)."),
        ("Transaction Latency", "< 150ms", "Tiempo de respuesta del Ledger en pruebas de carga."),
    ]

    y = 130
    for label, value, desc in metrics:
        draw_metric_card(page, 40, y, 200, 85, label, value, desc)
        y += 105

    # Footer
    y += 20
    draw_section_label(page, 40, y, "INFRAESTRUCTURA LISTA (LOIs)")
    page.insert_text((40, y + 25), "• Integración KYC/Biometría: COMPLETADA.", fontsize=11, color=RGB["text_primary"])


def update_master_plan_slide(page):
    """Actualiza la slide del Master Plan."""
    clean_page(page)
    draw_header(page, "The Master Plan (Execution)", "Estrategia secuencial de despliegue de capital.")

    phases = [
        ("FASE 1: R&D + CORE INFRA",
         "Construir Trust OS, Wallet y Contratos.\nSTATUS: COMPLETADO (Bootstrap).",
         RGB["primary"]),
        ("FASE 2: ALPHA TEST (VALIDACIÓN)",
         "Probar el sistema con 50 viajes manuales y Waitlist.\nSTATUS: COMPLETADO (Data obtenida).",
         RGB["primary"]),
        ("FASE 3: LIQUIDITY INJECTION (ESTA RONDA)",
         "Capitalizar el FGO y subsidiar oferta para lograr densidad.\nOBJETIVO: 18 Meses de Runway -> Series A.",
         RGB["info"]),
        ("FASE 4: MASS SCALE & AUTONOMY",
         "Expansión regional y gestión de flotas autónomas.\nVISIÓN: 2027+.",
         RGB["text_muted"]),
    ]

    y = 140
    for i, (title, desc, color) in enumerate(phases):
        is_last = (i == len(phases) - 1)
        draw_phase_item(page, 60, y, title, desc, color, is_last)
        y += 90


def update_unit_economics_slide(page):
    """Actualiza la slide de Unit Economics / The Equation."""
    clean_page(page)
    draw_header(page, "The Equation (Target Economics)", "Modelo matemático de viabilidad por unidad (First Principles).")

    # Fórmula
    page.insert_text(
        (40, 110),
        "CONTRIBUTION MARGIN = (AOV x TAKE RATE) - COSTS - RISK",
        fontsize=13,
        fontname="helv",
        color=RGB["primary"]
    )

    # Tabla de valores
    rows = [
        ("AOV (Ticket Objetivo)", "USD 120.00", "Alquiler promedio 3-4 días (Benchmark).", RGB["text_primary"]),
        ("Take Rate (15%)", "USD 18.00", "Revenue Plataforma.", RGB["primary"]),
        ("FGO (10%)", "USD 12.00", "Fondo de Garantía (Pasivo/Pool).", RGB["text_primary"]),
        ("Costos PSP & Soporte", "- USD 7.20", "Pagos (3.5%) + Riesgo Est. (2.5%).", RGB["error"]),
    ]

    y = 160
    for label, value, desc, value_color in rows:
        page.insert_text((40, y), label, fontsize=13, color=RGB["text_primary"])
        page.insert_text((280, y), value, fontsize=13, fontname="helv", color=value_color)
        page.insert_text((420, y), desc, fontsize=11, color=RGB["text_secondary"])
        y += 40

    # Resultado
    y += 20
    page.insert_text(
        (120, y),
        "TARGET MARGIN: USD 10.80 por reserva (Positivo desde Day 1).",
        fontsize=14,
        fontname="helv",
        color=RGB["primary"]
    )

    # Notas
    y += 50
    draw_section_label(page, 40, y, "CÓMO EL 'TRUST OS' PROTEGE EL MARGEN:")
    notes = [
        "• Wallet Pre-Funded: Elimina el riesgo de impago (Payment Gap = 0).",
        "• Video Check-in: Reduce disputas subjetivas (Risk Cost baja 40%).",
        "• Hard Gate KYC: Bloquea identidad sintética antes de reservar.",
    ]
    for note in notes:
        y += 25
        page.insert_text((40, y), note, fontsize=11, color=RGB["text_primary"])


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Actualiza el pitch deck con los colores correctos."""

    # Archivos
    input_pdf = Path("/mnt/storage/Downloads/AutoRentar-PitchDeckk-STRATEGIC-V14-ENGINEERING.pdf")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_pdf = Path(f"/mnt/storage/Downloads/AutoRentar-PitchDeck-V15-COLORS-{timestamp}.pdf")

    if not input_pdf.exists():
        print(f"[ERROR] No se encontró el PDF: {input_pdf}")
        sys.exit(1)

    print("=" * 60)
    print("  AutoRentar Pitch Deck Color Updater")
    print("=" * 60)
    print()
    print(f"  Input:  {input_pdf}")
    print(f"  Output: {output_pdf}")
    print()

    # Abrir PDF
    doc = fitz.open(str(input_pdf))
    total_pages = len(doc)
    print(f"  Páginas totales: {total_pages}")
    print()

    # Mostrar paleta de colores
    print("  Paleta de colores aplicada:")
    print(f"    Verde Principal:  {COLORS['primary']}")
    print(f"    Acento Lima:      {COLORS['accent_lime']}")
    print(f"    Fondo Oscuro:     {COLORS['bg_dark']}")
    print(f"    Texto Principal:  {COLORS['text_primary']}")
    print()

    # Actualizar slides específicas
    slides_to_update = {
        14: ("System Validation", update_system_validation_slide),
        19: ("Master Plan", update_master_plan_slide),
        8: ("Unit Economics", update_unit_economics_slide),
    }

    print("  Actualizando slides:")
    for page_idx, (name, update_func) in slides_to_update.items():
        if page_idx < total_pages:
            print(f"    [{page_idx + 1}/{total_pages}] {name}...")
            update_func(doc[page_idx])
        else:
            print(f"    [SKIP] Página {page_idx} no existe")

    print()

    # Guardar
    doc.save(str(output_pdf))
    doc.close()

    print("-" * 60)
    print(f"  PDF guardado: {output_pdf}")
    print("-" * 60)
    print()
    print("  Colores aplicados correctamente.")
    print()


if __name__ == "__main__":
    main()
