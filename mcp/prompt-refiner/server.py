import os
import sys
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from mcp.server.fastmcp import FastMCP
import google.generativeai as genai
from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Cargar variables de entorno desde la ruta del script
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configuración de Gemini
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    # Escribir a stderr para no romper el protocolo MCP (que usa stdout)
    sys.stderr.write("ADVERTENCIA: GEMINI_API_KEY no encontrada en .env\n")

genai.configure(api_key=API_KEY)

# Inicializar FastMCP
mcp = FastMCP("Prompt Refiner")

# --- Modelos de Datos (Pydantic) para Estructura ---

class QuestionChoice(BaseModel):
    question_text: str
    category: str = Field(description="The most relevant category for the question, dynamically chosen by the AI (e.g., 'Database Schema', 'Frontend Components', 'API Design', 'Security', 'Performance', 'Business Logic').")
    choices: List[str]

class RefinementResult(BaseModel):
    status: str = Field(description="'optimized' or 'clarification_needed'")
    options: Optional[List[str]] = Field(default=None, description="List of 3 optimized prompts if status is optimized")
    questions: Optional[List[QuestionChoice]] = Field(default=None, description="List of questions if status is clarification_needed")

# --- Meta-Prompt del Sistema ---

SYSTEM_PROMPT = """
Rol: Eres un Arquitecto de Software Senior y Experto en Ingeniería de Prompts.

Misión: Analizar un 'raw_prompt' (solicitud cruda) de un usuario contra un 'platform_context' (contexto técnico).

Regla de Oro (Threshold de Ambigüedad):
Si la solicitud del usuario tiene menos del 90% de claridad técnica necesaria para ejecución inmediata (faltan detalles de implementación, restricciones, manejo de errores, o UI), DEBES generar preguntas de clarificación. NO asumas, PREGUNTA.

Reglas para la Generación de Preguntas (si es necesario clarificar):
- Genera 3-4 preguntas de selección múltiple para acotar el alcance.
- Para cada pregunta, determina la *categoría más relevante* de forma dinámica. NO te limites a categorías fijas. Ejemplos de categorías dinámicas: "Base de Datos", "Interfaz de Usuario (UI/UX)", "Arquitectura de Backend", "Seguridad", "Rendimiento", "Lógica de Negocio", "Integraciones".
- Las categorías deben reflejar el dominio técnico específico del tema de la pregunta.

Objetivo de Salida (JSON Estricto):
Debes devolver UN objeto JSON.

CASO A: Si el prompt es vago o ambiguo (status: "clarification_needed"):
Genera 3-4 preguntas de selección múltiple.

CASO B: Si el prompt es claro y ejecutable (status: "optimized"):
Genera 3 versiones del prompt optimizado para un LLM de codificación:
1. "Conciso": Directo al grano.
2. "Robusto": Enfocado en manejo de errores y tipos.
3. "Educativo": Explicando el por qué de la implementación.

Formato de Respuesta JSON esperado:
{
  "status": "optimized" | "clarification_needed",
  "options": ["Prompt 1...", "Prompt 2...", "Prompt 3..."], // Solo si optimized
  "questions": [ // Solo si clarification_needed
    {
      "category": "Una categoría dinámica relevante (ej: 'Base de Datos')",
      "question_text": "¿Pregunta?",
      "choices": ["Opción A", "Opción B", "Opción C"]
    }
  ]
}
"""

@mcp.tool()
async def refine_user_prompt(
    raw_prompt: str, 
    platform_context: str, 
    previous_answers: Dict[str, str] = {}
) -> str:
    """
    Analiza un prompt de usuario, evalúa su ambigüedad y devuelve prompts optimizados o preguntas de clarificación.
    
    Args:
        raw_prompt: La idea original del usuario.
        platform_context: Descripción técnica del entorno (ej: stack, librerías).
        previous_answers: Diccionario con respuestas a preguntas anteriores (si es un reintento).
    """
    
    model = genai.GenerativeModel('models/gemini-2.5-pro', system_instruction=SYSTEM_PROMPT)
    # Fallback a flash si pro no está disponible o para pruebas rápidas, 
    # pero el plan pide pro/exp para razonamiento.
    # model = genai.GenerativeModel('gemini-1.5-flash', system_instruction=SYSTEM_PROMPT)

    # Construir el mensaje para Gemini
    user_message = f"""
    CONTEXTO DE PLATAFORMA:
    {platform_context}

    PROMPT DEL USUARIO (RAW):
    "{raw_prompt}"
    """

    if previous_answers:
        user_message += f"""
        
        RESPUESTAS DE CLARIFICACIÓN PREVIAS DEL USUARIO:
        {json.dumps(previous_answers, indent=2)}
        
        Nota: Utiliza estas respuestas para resolver la ambigüedad y generar ahora sí los prompts optimizados (status: 'optimized'), a menos que todavía falte información crítica.
        """

    try:
        # Generar contenido forzando JSON
        response = model.generate_content(
            user_message,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2 # Baja temperatura para consistencia estructural
            )
        )
        
        # Devolvemos el texto JSON crudo. 
        # El cliente MCP se encargará de mostrarlo o parsearlo según su capacidad.
        return response.text

    except Exception as e:
        return json.dumps({
            "status": "error",
            "error_message": str(e)
        })

if __name__ == "__main__":
    # Ejecución via stdio
    mcp.run()
