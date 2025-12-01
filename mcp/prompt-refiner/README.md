# Prompt Refiner MCP Server

Este servidor MCP utiliza Google Gemini para interceptar tus prompts, analizar su ambigüedad y sugerir mejoras o preguntas de clarificación antes de que empieces a codificar.

## Instalación

1.  Asegúrate de tener Python 3 instalado.
2.  Navega a este directorio:
    ```bash
    cd mcp/prompt-refiner
    ```
3.  Crea un entorno virtual e instala dependencias:
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```
4.  Configura tu API Key:
    ```bash
    cp .env.example .env
    # Edita .env y pon tu clave de Google AI Studio
    ```

## Uso con Clientes MCP (Claude Desktop, Cursor, etc.)

Debes agregar la configuración a tu cliente para que ejecute este script.

**Comando:** `python`
**Argumentos:** `/ruta/absoluta/a/autorenta/mcp/prompt-refiner/server.py`
**Entorno:** Asegúrate de usar el python del entorno virtual.

### Ejemplo de Configuración (Claude Desktop):

```json
{
  "mcpServers": {
    "prompt-refiner": {
      "command": "/home/edu/autorenta/mcp/prompt-refiner/venv/bin/python",
      "args": [
        "/home/edu/autorenta/mcp/prompt-refiner/server.py"
      ]
    }
  }
}
```

## Funcionamiento

El servidor expone la herramienta `refine_user_prompt`. 

1.  El usuario envía un prompt vago.
2.  Gemini analiza el contexto y devuelve preguntas (JSON).
3.  El usuario responde.
4.  Gemini genera 3 prompts optimizados listos para producción.
