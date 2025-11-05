# Configuración de IA Autónoma para Autorenta

Este documento describe cómo configurar Claude Code y GitHub Copilot CLI para trabajar de manera autónoma en el proyecto Autorenta.

## 🤖 Herramientas Configuradas

### 1. Claude Code
- **Configuración**: `.claude.json`
- **Modo autónomo**: Habilitado
- **Timeout**: 15 minutos
- **Idioma preferido**: Español

### 2. GitHub Copilot CLI
- **Configuración**: `.github/copilot-instructions.md`
- **VSCode Settings**: `.vscode/settings.json`
- **Integración**: Habilitada para todos los tipos de archivo

### 3. Script de Automatización
- **Ubicación**: `tools/claude-automation.sh`
- **Permisos**: Ejecutable
- **Propósito**: Automatizar tareas comunes de desarrollo

## 📋 Tareas Autónomas Configuradas

### Pre-Commit
- ✅ Lint check
- ✅ Unit tests rápidos
- ✅ Verificación de tipos TypeScript

### Pre-Deploy
- ✅ Suite completa de tests
- ✅ Build de todos los paquetes
- ✅ Sincronización de tipos Supabase
- ✅ Pipeline CI completo

### Code Review
- ✅ Verificación de patrones Angular
- ✅ Validación de políticas RLS Supabase
- ✅ Auditoría de seguridad
- ✅ Verificación de cobertura de tests

## 🚀 Uso del Script de Automatización

### Comandos Disponibles

```bash
# Ver ayuda
./tools/claude-automation.sh help

# Pre-commit checks
./tools/claude-automation.sh pre-commit

# Pre-deployment checks
./tools/claude-automation.sh pre-deploy

# Code review
./tools/claude-automation.sh code-review

# Setup desarrollo
./tools/claude-automation.sh setup-dev

# Generar componente
./tools/claude-automation.sh generate-component <feature> <name>

# Generar servicio
./tools/claude-automation.sh generate-service <name>

# Sincronizar tipos
./tools/claude-automation.sh sync-types

# Ejecutar tests
./tools/claude-automation.sh run-tests unit
./tools/claude-automation.sh run-tests e2e
./tools/claude-automation.sh run-tests coverage
./tools/claude-automation.sh run-tests all

# Deploy
./tools/claude-automation.sh deploy web
./tools/claude-automation.sh deploy worker
./tools/claude-automation.sh deploy all
```

## 🎯 Configuración de Claude Code

### Activar Claude Code

1. Instalar la extensión de Claude en VSCode
2. El archivo `.claude.json` ya está configurado
3. Claude Code leerá automáticamente la configuración

### Características Habilitadas

- **Modo Autónomo**: Claude puede ejecutar comandos sin confirmación
- **Skills Recomendados**:
  - angular-scaffolder
  - supabase-rls-debugger
  - typescript-sync
  - test-generator
  - performance-optimizer
  - security-auditor

### Reglas de Comportamiento

1. Siempre usar componentes standalone
2. Usar patrón inject() para inyección de dependencias
3. Implementar lazy loading para todas las rutas
4. Usar Angular Signals para gestión de estado
5. Seguir kebab-case para nombres de archivos
6. Escribir tests para todos los servicios y componentes
7. Asegurar políticas RLS configuradas correctamente
8. Usar TypeScript en modo strict
9. Seguir guía de estilo Angular
10. Documentar lógica compleja con comentarios

## 🔧 Configuración de GitHub Copilot

### Activar Copilot CLI

```bash
# Instalar Copilot CLI
npm install -g @githubnext/github-copilot-cli

# Configurar alias
echo 'eval "$(github-copilot-cli alias -- "$0")"' >> ~/.bashrc
source ~/.bashrc

# Uso
?? "cómo crear un componente standalone"
git? "crear una rama para nueva feature"
gh? "crear un pull request"
```

### Características en VSCode

- **Sugerencias inline**: Habilitadas
- **Múltiples sugerencias**: 3 opciones
- **Auto-formato**: Habilitado
- **Organización de imports**: Automática
- **Tipos de archivo soportados**: TS, JS, HTML, CSS, JSON, MD

## 📚 Workflows Disponibles

### Desarrollo
```bash
pnpm run dev          # Setup completo
pnpm run dev:web      # Solo web app
pnpm run dev:worker   # Solo worker
```

### Testing
```bash
pnpm run test              # Tests unitarios
pnpm run test:quick        # Tests rápidos
pnpm run test:coverage     # Con cobertura
pnpm run test:e2e          # Tests E2E
pnpm run test:e2e:ui       # E2E con UI
```

### Build
```bash
pnpm run build        # Build completo
pnpm run build:web    # Solo web
```

### Deployment
```bash
pnpm run deploy         # Deploy completo
pnpm run deploy:web     # Solo web
pnpm run deploy:worker  # Solo worker
```

### Utilidades
```bash
pnpm run lint              # Lint
pnpm run lint:fix          # Fix lint
pnpm run ci                # Pipeline CI
pnpm run sync:types        # Sync tipos Supabase
pnpm run check:skills      # Check Claude skills
```

## 🔐 Seguridad

### Reglas de Seguridad Configuradas

- ❌ Nunca commitear secrets o API keys
- ✅ Siempre usar políticas RLS
- ✅ Validar inputs de usuario
- ✅ Sanitizar datos antes de mostrar
- ✅ Usar solo HTTPS
- ✅ Implementar políticas CORS apropiadas

### Verificación Automática

El script de automatización verifica:
- Hardcoded secrets en commits
- console.log statements
- TODO comments
- Políticas RLS faltantes

## 📖 Documentación del Proyecto

- **Arquitectura**: `CLAUDE.md`
- **Patrones**: `PATTERNS.md`
- **Guía de Skills**: `CLAUDE_SKILLS_GUIDE.md`
- **Workflows**: `tools/claude-workflows.sh`

## 🎨 Convenciones de Código

### Nombres de Archivo
- Componentes: `nombre.component.ts`
- Servicios: `nombre.service.ts`
- Páginas: `nombre.page.ts`
- Modelos: `nombre.model.ts`
- Tests: `nombre.spec.ts`

### Estilo de Código
- TypeScript strict mode
- Preferir const sobre let
- Usar async/await sobre promises
- Usar template literals
- Documentar lógica compleja
- Funciones pequeñas y enfocadas
- Principio de responsabilidad única

## 🔄 Integración Continua

### Pipeline CI Automatizado

El comando `pnpm run ci` ejecuta:
1. Lint checks
2. Unit tests
3. Build verification
4. Type checking
5. E2E tests (opcional)

## 💡 Tips para Trabajo Autónomo

### Con Claude Code

1. **Usar comandos naturales**: "crea un componente de login"
2. **Ser específico**: "añade validación al formulario de registro"
3. **Pedir explicaciones**: "explica cómo funciona esta política RLS"
4. **Revisar cambios**: Siempre revisar código generado

### Con Copilot CLI

1. **Usar el prefijo ??**: Para preguntas generales
2. **Usar git?**: Para comandos de git
3. **Usar gh?**: Para operaciones de GitHub
4. **Ser claro**: Preguntas específicas dan mejores respuestas

## 🐛 Troubleshooting

### Claude Code no responde
- Verificar que `.claude.json` existe
- Verificar timeout (15 min por defecto)
- Revisar logs de Claude

### Copilot no sugiere
- Verificar extensión instalada
- Verificar `.vscode/settings.json`
- Verificar conexión a internet
- Revisar configuración en GitHub

### Scripts fallan
- Verificar permisos de ejecución
- Verificar pnpm instalado
- Verificar dependencias instaladas
- Revisar logs de error

## 📞 Soporte

Para problemas o sugerencias:
1. Revisar documentación del proyecto
2. Ejecutar `pnpm run workflows` para ver comandos disponibles
3. Consultar `tools/claude-automation.sh help`
4. Revisar logs de error

## 🔄 Actualización

Para actualizar configuraciones:

```bash
# Actualizar dependencias
pnpm install

# Sincronizar tipos
pnpm run sync:types

# Verificar configuración
./tools/claude-automation.sh setup-dev
```

---

**Nota**: Esta configuración está diseñada para maximizar la productividad mediante automatización inteligente, manteniendo siempre el control y la supervisión del desarrollador.
