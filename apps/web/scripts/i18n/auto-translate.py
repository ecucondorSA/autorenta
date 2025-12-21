#!/usr/bin/env python3
"""
Script de Traducción Automática para AutoRenta
Traduce automáticamente textos estáticos a claves i18n

Uso:
    python scripts/auto-translate.py --scan                    # Escanear textos sin modificar
    python scripts/auto-translate.py --apply                   # Aplicar traducciones
    python scripts/auto-translate.py --file path/to/file.html  # Traducir archivo específico
"""

import re
import json
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Set
import sys

# Patrones para detectar textos traducibles
PATTERNS = {
    # Textos en elementos HTML: <button>Texto</button>
    'html_content': re.compile(r'>([A-ZÁÉÍÓÚÑ][^<]{2,50}?)<', re.MULTILINE),

    # Textos en atributos: placeholder="Texto", aria-label="Texto"
    'html_attributes': re.compile(r'(placeholder|aria-label|alt|title)="([A-ZÁÉÍÓÚÑ][^"]{2,50}?)"'),

    # Strings en TypeScript: 'Texto' o "Texto"
    'ts_strings': re.compile(r'''(?:['"])([A-ZÁÉÍÓÚÑ][^'"]{2,50}?)(?:['"])'''),
}

# Textos que no deben traducirse
EXCLUDE_PATTERNS = [
    r'^https?://',  # URLs
    r'^\d+$',       # Solo números
    r'^[A-Z_]+$',   # Constantes en mayúsculas
    r'^\w+\(\)',    # Llamadas a funciones
    r'{{.*}}',      # Interpolaciones de Angular
    r'\[.*\]',      # Bindings de Angular
    r'^\$',         # Variables
]

# Diccionario de traducciones ES -> PT (casos comunes)
TRANSLATIONS = {
    # Navegación
    "Inicio": "Início",
    "Buscar autos": "Buscar carros",
    "Buscar": "Buscar",
    "Autos": "Carros",
    "Carros": "Carros",
    "Auto": "Carro",
    "Carro": "Carro",
    "Publicar": "Publicar",
    "Publicar auto": "Publicar carro",
    "Mis reservas": "Minhas reservas",
    "Reservas": "Reservas",
    "Billetera": "Carteira",
    "Wallet": "Carteira",
    "Perfil": "Perfil",
    "Mi perfil": "Meu perfil",
    "Menú": "Menu",
    "Abrir menú": "Abrir menu",
    "Cerrar menú": "Fechar menu",

    # Acciones
    "Ingresar": "Entrar",
    "Iniciar sesión": "Entrar",
    "Registrarse": "Cadastrar",
    "Cerrar sesión": "Sair",
    "Guardar": "Salvar",
    "Cancelar": "Cancelar",
    "Eliminar": "Excluir",
    "Editar": "Editar",
    "Volver": "Voltar",
    "Siguiente": "Próximo",
    "Anterior": "Anterior",
    "Confirmar": "Confirmar",
    "Enviar": "Enviar",
    "Buscar": "Pesquisar",
    "Filtrar": "Filtrar",

    # Común
    "Cargando...": "Carregando...",
    "Error": "Erro",
    "Éxito": "Sucesso",
    "Sí": "Sim",
    "No": "Não",
    "Aceptar": "Aceitar",
    "Saltar al contenido": "Pular para o conteúdo",
    "Cambiar tema": "Mudar tema",

    # Wallet
    "Depositar": "Depositar",
    "Retirar": "Sacar",
    "Saldo disponible": "Saldo disponível",
    "Fondos bloqueados": "Fundos bloqueados",

    # Formularios
    "Nombre": "Nome",
    "Nombre completo": "Nome completo",
    "Apellido": "Sobrenome",
    "Email": "E-mail",
    "Correo electrónico": "E-mail",
    "Contraseña": "Senha",
    "Teléfono": "Telefone",
    "Dirección": "Endereço",
    "Ciudad": "Cidade",
    "País": "País",
    "Código postal": "CEP",

    # Fechas
    "Fecha": "Data",
    "Hora": "Hora",
    "Día": "Dia",
    "Días": "Dias",
    "Mes": "Mês",
    "Año": "Ano",
    "Hoy": "Hoje",
    "Ayer": "Ontem",
    "Mañana": "Amanhã",
}


def should_exclude(text: str) -> bool:
    """Verifica si un texto debe excluirse de la traducción."""
    for pattern in EXCLUDE_PATTERNS:
        if re.search(pattern, text):
            return True
    return False


def generate_key(text: str, context: str = "common") -> str:
    """
    Genera una clave i18n a partir de un texto.

    Ejemplos:
        "Buscar autos" -> "nav.cars"
        "Iniciar Sesión" -> "auth.login.title"
    """
    # Limpia el texto
    clean = text.strip()

    # Casos especiales conocidos
    key_map = {
        "Buscar autos": "nav.cars",
        "Mis reservas": "nav.bookings",
        "Mi perfil": "nav.profile",
        "Publicar": "nav.publish",
        "Wallet": "nav.wallet",
        "Billetera": "nav.wallet",
        "Ingresar": "auth.login.button",
        "Iniciar sesión": "auth.login.title",
        "Cambiar tema": "common.changeTheme",
        "Saltar al contenido": "common.skipToContent",
        "Menú": "nav.menu",
        "Abrir menú": "nav.openMenu",
        "Cerrar menú": "nav.closeMenu",
    }

    if clean in key_map:
        return key_map[clean]

    # Genera clave genérica
    key = clean.lower()
    key = re.sub(r'[áàä]', 'a', key)
    key = re.sub(r'[éèë]', 'e', key)
    key = re.sub(r'[íìï]', 'i', key)
    key = re.sub(r'[óòö]', 'o', key)
    key = re.sub(r'[úùü]', 'u', key)
    key = re.sub(r'ñ', 'n', key)
    key = re.sub(r'[^a-z0-9]+', '_', key)
    key = key.strip('_')

    return f"{context}.{key}"


def translate_to_pt(text: str) -> str:
    """Traduce un texto de español a portugués."""
    if text in TRANSLATIONS:
        return TRANSLATIONS[text]

    # Traducción automática simple (puede mejorarse con API)
    # Por ahora, devuelve el mismo texto si no está en el diccionario
    return text


def scan_file(file_path: Path) -> List[Tuple[str, str, int]]:
    """
    Escanea un archivo buscando textos traducibles.

    Returns:
        Lista de tuplas (texto, contexto, número_de_línea)
    """
    results = []

    try:
        content = file_path.read_text(encoding='utf-8')
        lines = content.split('\n')

        for i, line in enumerate(lines, 1):
            # Buscar en contenido HTML
            for match in PATTERNS['html_content'].finditer(line):
                text = match.group(1).strip()
                if text and not should_exclude(text) and len(text) > 2:
                    results.append((text, 'html', i))

            # Buscar en atributos HTML
            for match in PATTERNS['html_attributes'].finditer(line):
                text = match.group(2).strip()
                if text and not should_exclude(text) and len(text) > 2:
                    results.append((text, 'attribute', i))

    except Exception as e:
        print(f"Error leyendo {file_path}: {e}")

    return results


def scan_project(src_path: Path) -> Dict[str, List[Tuple[str, str, int]]]:
    """Escanea todo el proyecto buscando textos traducibles."""
    all_texts = {}

    # Buscar archivos HTML
    html_files = list(src_path.rglob('*.html'))

    print(f"📁 Escaneando {len(html_files)} archivos HTML...")

    for file_path in html_files:
        # Excluir node_modules, dist, etc.
        if 'node_modules' in str(file_path) or 'dist' in str(file_path):
            continue

        texts = scan_file(file_path)
        if texts:
            all_texts[str(file_path.relative_to(src_path))] = texts

    return all_texts


def update_json_files(texts: Set[str], i18n_path: Path):
    """Actualiza los archivos JSON con nuevas claves de traducción."""
    es_file = i18n_path / 'es.json'
    pt_file = i18n_path / 'pt.json'

    # Cargar archivos existentes
    es_data = json.loads(es_file.read_text(encoding='utf-8'))
    pt_data = json.loads(pt_file.read_text(encoding='utf-8'))

    new_keys = 0

    for text in texts:
        key = generate_key(text)
        pt_text = translate_to_pt(text)

        # Parsear la clave (ej: "nav.cars" -> {"nav": {"cars": ...}})
        parts = key.split('.')

        # Verificar si ya existe
        es_exists = es_data
        pt_exists = pt_data
        for part in parts[:-1]:
            es_exists = es_exists.get(part, {})
            pt_exists = pt_exists.get(part, {})

        if parts[-1] not in es_exists:
            # Agregar nueva clave
            es_current = es_data
            pt_current = pt_data

            for part in parts[:-1]:
                if part not in es_current:
                    es_current[part] = {}
                    pt_current[part] = {}
                es_current = es_current[part]
                pt_current = pt_current[part]

            es_current[parts[-1]] = text
            pt_current[parts[-1]] = pt_text
            new_keys += 1
            print(f"  ✅ {key}: {text} -> {pt_text}")

    if new_keys > 0:
        # Guardar archivos actualizados
        es_file.write_text(json.dumps(es_data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        pt_file.write_text(json.dumps(pt_data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        print(f"\n✨ {new_keys} nuevas claves agregadas a los archivos JSON")
    else:
        print("\n✅ No se encontraron nuevas claves para agregar")


def main():
    parser = argparse.ArgumentParser(description='Herramienta de traducción automática para AutoRenta')
    parser.add_argument('--scan', action='store_true', help='Escanear archivos sin modificar')
    parser.add_argument('--apply', action='store_true', help='Aplicar traducciones automáticamente')
    parser.add_argument('--file', type=str, help='Traducir archivo específico')
    parser.add_argument('--update-json', action='store_true', help='Solo actualizar archivos JSON')

    args = parser.parse_args()

    # Rutas
    project_root = Path(__file__).parent.parent
    src_path = project_root / 'src'
    i18n_path = src_path / 'assets' / 'i18n'

    if args.scan or not any([args.apply, args.file, args.update_json]):
        # Modo escaneo
        print("🔍 Escaneando proyecto en busca de textos traducibles...\n")
        all_texts = scan_project(src_path / 'app')

        total_texts = 0
        unique_texts = set()

        for file_path, texts in all_texts.items():
            if texts:
                print(f"\n📄 {file_path}:")
                for text, context, line_num in texts:
                    print(f"  Línea {line_num}: {text}")
                    unique_texts.add(text)
                    total_texts += 1

        print(f"\n📊 Resumen:")
        print(f"  - Archivos con textos: {len(all_texts)}")
        print(f"  - Total de textos: {total_texts}")
        print(f"  - Textos únicos: {len(unique_texts)}")

        if unique_texts:
            print(f"\n💡 Para actualizar los archivos JSON, ejecuta:")
            print(f"   python scripts/auto-translate.py --update-json")

    elif args.update_json:
        # Actualizar solo archivos JSON
        print("📝 Actualizando archivos JSON...\n")
        all_texts = scan_project(src_path / 'app')

        unique_texts = set()
        for texts in all_texts.values():
            for text, _, _ in texts:
                unique_texts.add(text)

        update_json_files(unique_texts, i18n_path)

    elif args.apply:
        print("🚧 Función de aplicación automática aún no implementada")
        print("Por ahora, usa --scan y --update-json")
        sys.exit(1)


if __name__ == '__main__':
    main()
