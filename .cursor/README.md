# Cursor Configuration para AutoRenta

Esta carpeta contiene configuraciones específicas para Cursor Editor.

## 📁 Archivos

- **team-commands.md**: Comandos completos para configurar en Cursor Dashboard
- **team-commands-quick-setup.md**: Guía rápida de setup
- **runtime-config.json**: Configuración de runtime (si existe)
- **secrets-config.json**: Configuración de secrets (si existe)

## 🚀 Setup Rápido

### Paso 1: Accede al Dashboard
1. Ve a https://cursor.sh/dashboard
2. Inicia sesión con tu cuenta
3. Selecciona tu equipo (si aplica)

### Paso 2: Configura Team Commands
1. Ve a **Team Settings** → **Commands**
2. Haz clic en **"New Command"**
3. Copia el contenido de cada sección desde `team-commands.md`
4. Pega y guarda cada command

### Paso 3: Verifica
1. Abre Cursor
2. Inicia un nuevo chat con Agent
3. Pregunta algo relacionado con Angular o Supabase
4. El agente debería seguir automáticamente los patrones definidos

## 📋 Comandos Disponibles

### Esenciales (Mínimo)
1. **autorenta-angular-patterns**: Patrones Angular (standalone, signals)
2. **autorenta-supabase-patterns**: Patrones Supabase (RLS, Storage, Auth)
3. **autorenta-testing-standards**: Estándares de testing

### Completos (Recomendado)
4. **autorenta-code-style**: Estilo de código (Prettier, ESLint, Tailwind)
5. **autorenta-security-performance**: Seguridad y performance
6. **autorenta-payment-system**: Sistema de pagos (CRÍTICO)
7. **autorenta-architecture**: Resumen de arquitectura

## 🔄 Actualización

Cuando actualices los comandos:
1. Edita `team-commands.md` localmente
2. Copia el contenido actualizado al Dashboard
3. Notifica al equipo sobre cambios importantes

## 📚 Documentación Relacionada

- `.cursorrules`: Reglas locales del proyecto (solo para este workspace)
- `CLAUDE.md`: Documentación completa del proyecto
- `CLAUDE_ARCHITECTURE.md`: Arquitectura técnica detallada

## ⚠️ Nota Importante

Los **Team Commands** se aplican automáticamente a todos los miembros del equipo y se gestionan desde el Dashboard web. No necesitas archivos locales para que funcionen, pero estos archivos sirven como documentación y referencia.

---

**Última actualización**: 2025-01-XX
