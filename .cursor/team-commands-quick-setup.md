# 🚀 Quick Setup - Team Commands para Cursor Dashboard

## Pasos Rápidos

### 1. Accede al Dashboard
Ve a: https://cursor.sh/dashboard → **Team Settings** → **Commands**

### 2. Copia y Pega Cada Command

Copia el contenido de cada sección desde `.cursor/team-commands.md` y créalo como un nuevo Team Command en el dashboard.

### 3. Comandos Esenciales (Mínimo)

Si solo quieres configurar lo esencial, copia estos 3:

#### Command 1: Angular Patterns
```
# AutoRenta - Angular Patterns
- SIEMPRE usa standalone components (Angular 17+)
- NUNCA uses NgModules
- Usa signals para estado reactivo
- Paths de Storage SIN bucket prefix: {userId}/{filename}
```

#### Command 2: Supabase Patterns
```
# AutoRenta - Supabase
- SIEMPRE valida errores de Supabase explícitamente
- RLS policies en todas las tablas
- Storage paths: {userId}/{filename} (SIN bucket prefix)
- NUNCA uses SUPABASE_SERVICE_ROLE_KEY en frontend
```

#### Command 3: Testing
```
# AutoRenta - Testing
- Cobertura mínima: 80%
- Tests unitarios: Karma + Jasmine
- E2E: Playwright
- Ubicación: *.spec.ts junto al archivo fuente
```

### 4. Verificación

1. Abre Cursor
2. Inicia un nuevo chat
3. Pregunta: "¿Cómo creo un componente Angular standalone?"
4. El agente debería seguir automáticamente los patrones definidos

---

**Nota**: Los Team Commands se aplican automáticamente a todos los miembros del equipo sin necesidad de archivos locales.







