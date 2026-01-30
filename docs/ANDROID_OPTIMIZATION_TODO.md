# AutoRenta - Mejoras de Optimización Android Pendientes

> **Análisis de gaps entre configuración actual y mejores prácticas.**
> Basado en el estudio de [ANDROID_OPTIMIZATION_GUIDE.md](./ANDROID_OPTIMIZATION_GUIDE.md)

---

## Resumen Ejecutivo

| Área | Estado Actual | Impacto Potencial |
|------|---------------|-------------------|
| R8 Básico | ✅ Configurado | - |
| Keep Rules | ✅ Optimizadas (2026-01-30) | 📈 Reducción 20-40% tamaño |
| Baseline Profiles | ✅ Configurado (2026-01-30) | 📈 15-30% faster startup |
| Resource Shrinking Optimizado | ✅ Habilitado (2026-01-30) | 📈 Recursos más pequeños |
| Monitoreo Vitals | ❌ No automatizado | 🛡️ Detección temprana crashes |
| Mapping.txt Backup | ✅ Automatizado (2026-01-30) | 🛡️ Debug de crashes producción |

**Estadísticas de R8 (ANTES de optimización - 2026-01-29):**
```
noObfuscationPercentage: 70.59%
noOptimizationPercentage: 71.14%
noShrinkingPercentage: 70.54%
```

✅ **Keep rules optimizadas el 2026-01-30** - Se espera >80% de código optimizado tras el próximo build.

---

## 1. Optimizar Keep Rules (ALTA PRIORIDAD)

### Problema Actual

```proguard
# DEMASIADO AMPLIO - conserva TODO el código de la app
-keep class app.autorentar.** { *; }

# DEMASIADO AMPLIO - conserva TODO el código de SDKs
-keep class com.facebook.** { *; }
-keep class com.google.firebase.** { *; }
-keep class io.sentry.** { *; }
```

Resultado: 70% del código no está siendo optimizado.

### Solución

**Archivo:** `apps/web/android/app/proguard-rules.pro`

```proguard
# ============================================
# AUTORENTAR - REGLAS OPTIMIZADAS
# ============================================

# Solo conservar MainActivity y clases necesarias
-keep class app.autorentar.MainActivity { *; }

# ============================================
# CAPACITOR CORE (mínimo necesario)
# ============================================
-keep public class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}
-keep class com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.JSObject { *; }
-keep class com.getcapacitor.PluginCall { *; }

# JavaScript interface (específico)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================================
# SENTRY (usar reglas oficiales más específicas)
# ============================================
# Solo las clases necesarias para crash reporting
-keep class io.sentry.android.** { *; }
-keep class io.sentry.SentryOptions { *; }
-keep class io.sentry.protocol.** { *; }
-dontwarn io.sentry.**

# ============================================
# FIREBASE (reglas específicas)
# ============================================
-keep class com.google.firebase.messaging.** { *; }
-keep class com.google.firebase.iid.** { *; }
-dontwarn com.google.firebase.**

# ============================================
# FACEBOOK SDK (reglas específicas)
# ============================================
-keep class com.facebook.appevents.** { *; }
-keep class com.facebook.FacebookSdk { *; }
-keep class com.facebook.login.** { *; }
-dontwarn com.facebook.**

# ============================================
# DEBUGGING (mantener para stack traces legibles)
# ============================================
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
```

### Impacto Esperado

- **Reducción tamaño APK:** 20-40%
- **Mejor startup time:** 5-15%
- **Mejor ofuscación:** Protección contra ingeniería inversa

### Pasos de Implementación

1. **Backup de reglas actuales**
2. **Implementar nuevas reglas gradualmente** (ver sección 6)
3. **Testear cada cambio con build release**
4. **Staged rollout en Play Store**

---

## 2. Habilitar Baseline Profiles (ALTA PRIORIDAD)

### Problema Actual

No existen Baseline Profiles. El startup de la app no está optimizado.

### Solución

#### Paso 1: Agregar dependencias

**Archivo:** `apps/web/android/app/build.gradle`

```groovy
plugins {
    id 'com.android.application'
    id 'androidx.baselineprofile'  // AGREGAR
}

android {
    // ... existing config

    buildTypes {
        release {
            // ... existing config
        }
    }
}

dependencies {
    // ... existing dependencies

    // Baseline Profile
    implementation "androidx.profileinstaller:profileinstaller:1.3.1"
    baselineProfile project(':baselineprofile')
}

baselineProfile {
    dexLayoutOptimization = true
}
```

#### Paso 2: Crear módulo baselineprofile

**Archivo:** `apps/web/android/baselineprofile/build.gradle`

```groovy
plugins {
    id 'com.android.test'
    id 'androidx.baselineprofile'
}

android {
    namespace 'app.autorentar.baselineprofile'
    compileSdk 35

    defaultConfig {
        minSdk 28
        targetSdk 35
        testInstrumentationRunner "androidx.test.runner.AndroidJUnit4"
    }

    targetProjectPath = ":app"
}

baselineProfile {
    useConnectedDevices = true
}

dependencies {
    implementation "androidx.test.ext:junit:1.1.5"
    implementation "androidx.test.espresso:espresso-core:3.5.1"
    implementation "androidx.test.uiautomator:uiautomator:2.2.0"
    implementation "androidx.benchmark:benchmark-macro-junit4:1.2.3"
}
```

#### Paso 3: Crear generador de profile

**Archivo:** `apps/web/android/baselineprofile/src/main/java/app/autorentar/baselineprofile/BaselineProfileGenerator.kt`

```kotlin
package app.autorentar.baselineprofile

import androidx.benchmark.macro.junit4.BaselineProfileRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
@LargeTest
class BaselineProfileGenerator {

    @get:Rule
    val rule = BaselineProfileRule()

    @Test
    fun generate() {
        rule.collect(
            packageName = "app.autorentar",
            includeInStartupProfile = true
        ) {
            // Cold start
            pressHome()
            startActivityAndWait()

            // Wait for WebView to load
            device.waitForIdle()
            Thread.sleep(3000)

            // Simulate user scrolling (common action)
            device.swipe(
                device.displayWidth / 2,
                device.displayHeight * 3 / 4,
                device.displayWidth / 2,
                device.displayHeight / 4,
                10
            )
            device.waitForIdle()
        }
    }
}
```

#### Paso 4: Agregar al settings.gradle

```groovy
include ':baselineprofile'
```

### Impacto Esperado

- **Startup 15-30% más rápido**
- **Mejor experiencia first-launch**
- **DEX layout optimizado**

---

## 3. Habilitar Optimized Resource Shrinking (MEDIA PRIORIDAD)

### Problema Actual

No está habilitado `optimizedResourceShrinking`.

### Solución

**Archivo:** `apps/web/android/gradle.properties`

```properties
# Existing properties
org.gradle.jvmargs=-Xmx1536m
android.useAndroidX=true

# AGREGAR: Optimized resource shrinking (AGP < 9.0)
android.r8.optimizedResourceShrinking=true
```

### Impacto Esperado

- **Menor tamaño de recursos**
- **Eliminación más agresiva de recursos no usados**

---

## 4. Automatizar Backup de Mapping Files (MEDIA PRIORIDAD)

### Problema Actual

No hay automatización para guardar `mapping.txt` de cada release.

### Solución

**Archivo:** `.github/workflows/build-android.yml`

Agregar después del build:

```yaml
      - name: Archive ProGuard Mapping Files
        if: github.event.inputs.build_type == 'release'
        uses: actions/upload-artifact@v4
        with:
          name: proguard-mappings-${{ steps.version.outputs.version }}
          path: |
            apps/web/android/app/build/outputs/mapping/release/mapping.txt
            apps/web/android/app/build/outputs/mapping/release/seeds.txt
            apps/web/android/app/build/outputs/mapping/release/usage.txt
          retention-days: 365  # Guardar por 1 año
```

### Impacto

- **Capacidad de debug de crashes en producción**
- **Cumplimiento con mejores prácticas**

---

## 5. Workflow de Monitoreo Android Vitals (BAJA PRIORIDAD)

### Problema Actual

No hay monitoreo automatizado de crash rates.

### Solución

**Archivo:** `.github/workflows/android-vitals-check.yml`

```yaml
name: 📊 Android Vitals Check

on:
  schedule:
    - cron: '0 9 * * 1'  # Lunes 9am
  workflow_dispatch:

jobs:
  check-vitals:
    runs-on: ubuntu-latest
    steps:
      - name: Check Android Vitals via Play Console API
        run: |
          # Requiere configurar Google Play Developer API
          echo "TODO: Implementar integración con Play Developer API"
          echo "Verificar:"
          echo "- User-perceived crash rate < 1.09%"
          echo "- Per-device crash rate < 8%"
          echo "- ANR rate < 0.47%"
```

### Impacto

- **Detección temprana de regresiones**
- **Alertas proactivas**

---

## 6. Plan de Adopción Incremental

### Fase 1: Quick Wins (Semana 1)

| Tarea | Riesgo | Impacto |
|-------|--------|---------|
| Agregar `android.r8.optimizedResourceShrinking=true` | Bajo | Medio |
| Agregar backup de mapping.txt al workflow | Ninguno | Alto |
| Verificar R8 full mode está activo | Bajo | Medio |

### Fase 2: Keep Rules Optimization (Semana 2-3)

1. **Crear rama `feat/optimize-proguard`**
2. **Optimizar reglas una sección a la vez:**
   - Día 1: Capacitor core
   - Día 2: Sentry
   - Día 3: Firebase
   - Día 4: Facebook
   - Día 5: App code
3. **Build release local después de cada cambio**
4. **Test manual de todas las features**
5. **Staged rollout 5% → 20% → 50% → 100%**

### Fase 3: Baseline Profiles (Semana 4-5)

1. **Crear módulo baselineprofile**
2. **Implementar generador básico**
3. **Generar profiles en dispositivo real**
4. **Integrar en CI/CD**
5. **Medir mejora de startup time**

### Fase 4: Monitoreo (Semana 6)

1. **Configurar Play Developer API**
2. **Implementar workflow de vitals**
3. **Configurar alertas de Slack/email**

---

## 7. Métricas de Éxito

### Antes (Estado Actual)

| Métrica | Valor |
|---------|-------|
| Código optimizado | ~30% |
| Tamaño AAB | ~57 MB |
| Startup time | No medido |
| Crash rate | No monitoreado |

### Objetivo (Después de Implementar)

| Métrica | Objetivo |
|---------|----------|
| Código optimizado | >80% |
| Tamaño AAB | <45 MB (-20%) |
| Startup time | -25% vs actual |
| Crash rate | <0.5% |

---

## 8. Checklist de Implementación

### Fase 1 - Quick Wins ✅ COMPLETADO (2026-01-30)
- [x] Agregar `android.r8.optimizedResourceShrinking=true` a gradle.properties
- [x] Agregar step de backup mapping.txt al workflow CI
- [x] Verificar que `android.enableR8.fullMode` NO está en false

### Fase 2 - Keep Rules ✅ COMPLETADO (2026-01-30)
- [x] Backup de proguard-rules.pro actual
- [x] Optimizar reglas de Capacitor (específicas vs wildcards)
- [x] Optimizar reglas de Sentry
- [x] Optimizar reglas de Firebase
- [x] Optimizar reglas de Facebook
- [x] Remover `-keep class app.autorentar.** { *; }`
- [ ] Build release y test completo
- [ ] Staged rollout con monitoreo

### Fase 3 - Baseline Profiles ✅ COMPLETADO (2026-01-30)
- [x] Agregar plugin baselineprofile a build.gradle
- [x] Crear módulo baselineprofile
- [x] Implementar BaselineProfileGenerator
- [ ] Generar profiles en dispositivo real
- [x] Agregar profileinstaller dependency
- [x] Habilitar dexLayoutOptimization
- [ ] Medir startup time antes/después

### Fase 4 - Monitoreo
- [ ] Configurar Google Play Developer API credentials
- [ ] Crear workflow de chequeo semanal
- [ ] Configurar alertas

---

## 9. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Crash por keep rules muy restrictivas | Media | Alto | Staged rollout, testing exhaustivo |
| Baseline profiles no mejoran startup | Baja | Bajo | Medir antes/después |
| Aumento de tiempo de build | Media | Bajo | Acceptable trade-off |
| Romper integración de SDKs | Media | Alto | Test de todas las features |

---

## 10. Referencias

- [ANDROID_OPTIMIZATION_GUIDE.md](./ANDROID_OPTIMIZATION_GUIDE.md) - Guía completa
- [Android Developers - App Optimization](https://developer.android.com/topic/performance/app-optimization)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [Baseline Profiles](https://developer.android.com/topic/performance/baselineprofiles)

---

**Documento creado:** 2026-01-30
**Próxima revisión:** Después de Fase 2
**Owner:** Android Team
