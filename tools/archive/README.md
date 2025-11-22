# Crear Issues desde `docs/auto-task-issues.md`

Este script ayuda a crear issues automáticamente en GitHub leyendo `docs/auto-task-issues.md` donde tenemos los borradores.

Requisitos:
- `gh` CLI autenticado (https://cli.github.com/) o `GH_TOKEN` en el entorno
- Python 3.8+

Uso recomendado (revisión en seco):

```bash
python3 scripts/create_issues_from_docs.py --dry-run
```

Si todo está bien, crear issues reales con:

```bash
python3 scripts/create_issues_from_docs.py --dry-run false --repo ecucondorSA/autorenta --assignee @ecucondorSA
```

Notas:
- El script intenta detectar `owner/repo` automáticamente si ejecutas desde el repo local y tienes `gh` autenticado.
- Revisa los logs del `DRY RUN` antes de crear issues reales.
- Cada issue creado tendrá las etiquetas `auto-task` y `needs-scope` por defecto (puedes cambiarlo con `--labels`).

Seguridad:
- No pases tokens en la línea de comandos públicamente. Si usas CI, configura `GH_TOKEN` en secrets.

Si quieres, puedo también crear un workflow que ejecute este script de forma controlada (por ejemplo, un workflow dispatch protegido) para no depender del entorno local.
