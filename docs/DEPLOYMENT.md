# PROMPT PARA GEMINI - DEPLOYMENT.md

## Objetivo
Generar guia de deployment para Autorenta en produccion.

## Instrucciones para Gemini

Analiza los siguientes archivos y genera documentacion de deployment:

### Archivos a analizar:
1. `.github/workflows/*.yml` - CI/CD pipelines
2. `supabase/config.toml` - Config Supabase
3. `android/` - Config Android/Capacitor
4. `package.json` - Scripts de build
5. `angular.json` - Build configuration
6. `supabase/functions/**` - Edge Functions

### Secciones requeridas:

```markdown
# Deployment Guide

## Ambientes
- Development: [URL local]
- Staging: [Si existe]
- Production: [URL produccion]

## Pre-requisitos
[Listar herramientas necesarias]

## 1. Deploy Frontend (Web)

### Build de produccion
[Comandos de build]

### Hosting
[Donde se hostea - inferir de workflows]

### Variables de entorno produccion
[Listar TODAS las variables necesarias con descripcion]

## 2. Deploy Supabase

### Migraciones
[Como aplicar migraciones a produccion]

### Edge Functions
[Como deployar edge functions]

### Secrets
[Como configurar secrets en Supabase]

## 3. Deploy Mobile (Android)

### Build APK/AAB
[Comandos]

### Firmar aplicacion
[Proceso de firma]

### Subir a Play Store
[Pasos]

## 4. CI/CD Pipeline

### GitHub Actions
[Explicar cada workflow encontrado]

### Triggers
[Cuando se ejecuta cada pipeline]

## 5. Rollback

### Frontend
[Como hacer rollback]

### Database
[Como revertir migraciones]

### Edge Functions
[Como revertir funciones]

## 6. Monitoreo Post-Deploy

### Health checks
[Endpoints a verificar]

### Logs
[Donde ver logs]

## Checklist de Deploy
- [ ] [Lista de verificacion pre-deploy]
- [ ] [Lista de verificacion post-deploy]
```

### Formato de salida:
- Comandos especificos encontrados en el codigo
- Variables de entorno reales del proyecto
- Workflows reales de GitHub Actions
- Maximo 400 lineas
