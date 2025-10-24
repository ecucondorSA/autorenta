# Codex Helpers

Este directorio contiene utilidades para trabajar con Codex en `autorenta`.

## Scripts

- `start_full_access.sh`: crea (o reutiliza) una sesión tmux llamada `codex`, abre un shell en `autorenta` y lanza `codex` con permisos `danger-full-access` y política de aprobaciones `never`.
- `run_task.sh`: permite ejecutar una tarea puntual de Codex desde la terminal actual, por ejemplo `codex/run_task.sh "Actualiza el CardForm de Mercado Pago para soportar cuotas"`.

Ambos scripts respetan `set -euo pipefail` y pueden personalizarse mediante variables de entorno (`ROOT`, `SESSION`, etc.) según corresponda.

## Uso rápido

```bash
# Arrancar Codex dentro de tmux
autorenta/codex/start_full_access.sh

# Adjuntar a la sesión
tmux attach -t codex

# Lanzar una tarea individual
autorenta/codex/run_task.sh "Describe el funnel de alta de vehículo"
```

Para salir de tmux sin detener Codex usa `Ctrl+b` seguido de `d`.
