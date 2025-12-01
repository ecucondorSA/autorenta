import asyncio
import os
import json
from dotenv import load_dotenv

# Importar la función del servidor (asegúrate de que server.py esté en el path o misma carpeta)
try:
    from server import refine_user_prompt
except ImportError:
    print("Error: No se pudo importar server.py. Ejecuta este script desde la carpeta mcp/prompt-refiner/")
    exit(1)

async def run_test():
    print("--- INICIANDO PRUEBA DE PROMPT REFINER ---")
    
    # 1. Cargar entorno
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key or "tu_api_key" in api_key:
        print("❌ ERROR: GEMINI_API_KEY no configurada en .env")
        print("Por favor edita mcp/prompt-refiner/.env y agrega tu clave de Google AI Studio.")
        return

    print("✅ API Key detectada.")

    # 2. Definir caso de prueba
    test_prompt = "Quiero un login"
    test_context = "Aplicación Web Angular con Supabase Auth"
    
    print(f"\n📝 Prompt de prueba: '{test_prompt}'")
    print(f"💻 Contexto: '{test_context}'")
    print("\n⏳ Enviando a Gemini (esto puede tardar unos segundos)...")

    # 3. Ejecutar herramienta
    try:
        # Nota: refine_user_prompt es una función async
        result_json = await refine_user_prompt(test_prompt, test_context)
        
        # 4. Mostrar resultados
        print("\n📩 RESPUESTA RECIBIDA:")
        try:
            parsed = json.loads(result_json)
            print(json.dumps(parsed, indent=2, ensure_ascii=False))
            
            if parsed.get("status") == "clarification_needed":
                print("\n✅ PRUEBA EXITOSA: El modelo detectó ambigüedad y generó preguntas.")
            elif parsed.get("status") == "optimized":
                print("\n✅ PRUEBA EXITOSA: El modelo optimizó el prompt directamente.")
            else:
                print("\n⚠️ RESPUESTA INESPERADA (Revisar JSON arriba)")
                
        except json.JSONDecodeError:
            print("⚠️ Error: La respuesta no es un JSON válido.")
            print(result_json)

    except Exception as e:
        print(f"\n❌ ERROR DURANTE LA EJECUCIÓN:\n{e}")

if __name__ == "__main__":
    asyncio.run(run_test())
