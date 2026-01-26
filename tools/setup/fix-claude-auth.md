# Solución: Error de Autenticación Claude Code

## Problema
El callback de OAuth no puede conectarse a `localhost:35805` (o puerto similar).

## Soluciones

### Opción 1: Ejecutar manualmente en terminal

Abre una terminal y ejecuta:

```bash
claude setup-token
```

**Importante:** 
- No lo ejecutes desde un script o proceso en background
- Debe ejecutarse en una terminal interactiva
- El navegador se abrirá automáticamente

### Opción 2: Verificar firewall local

Si tienes firewall activo, permite conexiones localhost:

```bash
# Verificar estado
sudo ufw status

# Si está activo, permitir localhost (ya debería estar permitido por defecto)
sudo ufw allow from 127.0.0.1
```

### Opción 3: Usar puerto específico

Si el puerto está ocupado, puedes intentar forzar otro:

```bash
# Verificar qué está usando el puerto
lsof -i :35805

# Si hay algo, matarlo
kill -9 <PID>
```

### Opción 4: Limpiar y reintentar

```bash
# 1. Cerrar todas las instancias de Claude
pkill -f claude

# 2. Limpiar cache (opcional)
rm -rf ~/.claude/cache/*

# 3. Reintentar autenticación
claude setup-token
```

### Opción 5: Autenticación manual con token

Si nada funciona, puedes obtener un token manualmente:

1. Ve a https://claude.ai/api-keys
2. Crea una nueva API key
3. Configúrala en Claude Code:

```bash
# Esto depende de cómo Claude Code maneje API keys
# Revisa la documentación oficial
```

## Verificar autenticación

Después de autenticarte, verifica:

```bash
# Probar que funciona
claude -p "test"

# O verificar estado
claude --version
```

## Notas

- El proceso `claude setup-token` debe estar corriendo cuando el navegador intenta el callback
- No cierres la terminal hasta que el proceso termine
- Asegúrate de tener una suscripción activa de Claude
