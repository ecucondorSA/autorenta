# Android App Optimization - Guía Profesional Completa

> **Documentación exhaustiva sobre optimización de apps Android con R8, símbolos nativos, ProGuard, y mejores prácticas para Play Store.**
>
> Fuentes oficiales: [Android Developers](https://developer.android.com/topic/performance/app-optimization)

---

## Tabla de Contenidos

1. [Introducción a R8](#1-introducción-a-r8)
2. [Configuración Básica](#2-configuración-básica)
3. [Niveles de Optimización](#3-niveles-de-optimización)
4. [Keep Rules (Reglas de Conservación)](#4-keep-rules-reglas-de-conservación)
5. [Símbolos Nativos de Debug](#5-símbolos-nativos-de-debug)
6. [Baseline Profiles y DEX Layout](#6-baseline-profiles-y-dex-layout)
7. [Troubleshooting](#7-troubleshooting)
8. [Testing de Optimización](#8-testing-de-optimización)
9. [Android Vitals y Crash Reporting](#9-android-vitals-y-crash-reporting)
10. [Selección de Librerías](#10-selección-de-librerías)
11. [Adopción Incremental](#11-adopción-incremental)
12. [Checklist para Play Store](#12-checklist-para-play-store)
13. [Configuración para Capacitor/Ionic](#13-configuración-para-capacitorionic)

---

## 1. Introducción a R8

R8 es el optimizador oficial de Android que reemplaza a ProGuard. Proporciona:

| Beneficio | Descripción |
|-----------|-------------|
| **Menor tamaño** | Elimina código y recursos no utilizados |
| **Mejor rendimiento** | Optimiza bytecode y layout DEX |
| **Startup más rápido** | 15-30% más rápido con Baseline Profiles |
| **Menos ANRs** | Código optimizado reduce bloqueos |
| **Ofuscación** | Protege código contra ingeniería inversa |

### Qué hace R8

1. **Tree Shaking (Code Shrinking)** - Elimina código no referenciado
2. **Ofuscación** - Renombra clases y métodos a nombres cortos
3. **Optimización** - Reescribe código (inlining, eliminación de código muerto)
4. **Resource Shrinking** - Elimina recursos no utilizados

---

## 2. Configuración Básica

### build.gradle (Kotlin DSL)

```kotlin
android {
    buildTypes {
        release {
            // Habilita optimización de código
            isMinifyEnabled = true

            // Habilita eliminación de recursos no usados
            isShrinkResources = true

            // Archivos de reglas ProGuard/R8
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )

            // Símbolos nativos para debugging
            ndk {
                debugSymbolLevel = "FULL"  // o "SYMBOL_TABLE"
            }
        }
    }
}
```

### build.gradle (Groovy)

```groovy
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'

            ndk {
                debugSymbolLevel 'FULL'
            }
        }
    }
}
```

### gradle.properties

```properties
# Habilitar optimización completa de recursos (AGP < 9.0)
android.r8.optimizedResourceShrinking=true

# IMPORTANTE: Eliminar esta línea si existe (habilita R8 Full Mode)
# android.enableR8.fullMode=false
```

---

## 3. Niveles de Optimización

### Comparación de Modos

| Característica | Debug | Release (básico) | Release (full) |
|---------------|-------|------------------|----------------|
| Minificación | ❌ | ✅ | ✅ |
| Shrinking | ❌ | ✅ | ✅ |
| Ofuscación | ❌ | ✅ | ✅ |
| Optimización agresiva | ❌ | ❌ | ✅ |
| Tamaño APK | Grande | Medio | Pequeño |
| Stack traces legibles | ✅ | ❌ | ❌ |

### R8 Full Mode vs Compat Mode

**Full Mode** (recomendado para producción):
- Optimizaciones más agresivas
- Mejor reducción de tamaño
- Requiere keep rules más precisas

**Compat Mode** (para migración):
- Compatible con configuración ProGuard legacy
- Menos agresivo
- Bueno para adopción inicial

```properties
# Para usar Compat Mode temporalmente:
android.enableR8.fullMode=false
```

---

## 4. Keep Rules (Reglas de Conservación)

Las keep rules especifican qué código preservar durante la optimización.

### Sintaxis General

```
-<opción>[,<modificador>,...] <especificación_de_clase>
```

### Opciones Principales

| Opción | Efecto | Uso Recomendado |
|--------|--------|-----------------|
| `keep` | Conserva clase y miembros completamente | Raramente - muy restrictivo |
| `keepclassmembers` | Conserva miembros SI la clase existe | ✅ Recomendado - permite más optimización |
| `keepclasseswithmembers` | Conserva clase+miembros si TODOS los miembros existen | Para patrones específicos |
| `keepnames` | Previene renombrado pero permite eliminación | Evitar - usar `keep,allowshrinking` |

### Modificadores

| Modificador | Efecto |
|-------------|--------|
| `allowshrinking` | Permite eliminar si no se usa |
| `allowobfuscation` | Permite renombrar |
| `allowoptimization` | Permite optimizar código |
| `includedescriptorclasses` | Conserva clases en firmas de métodos |

### Ejemplos Prácticos

#### Conservar clase con todos sus miembros
```
-keep class com.myapp.api.ApiClient { *; }
```

#### Conservar solo miembros públicos
```
-keepclassmembers class com.myapp.models.User {
    public *;
}
```

#### Conservar constructores específicos (para Views customizados)
```
-keep class com.myapp.ui.MyCustomView {
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
}
```

#### Conservar por anotación
```
-keep @com.myapp.annotations.KeepForReflection class * { *; }
```

#### Conservar clases que implementan interfaz
```
-keep class * implements com.myapp.interfaces.Serializable { *; }
```

#### Conservar campos para serialización JSON
```
-keepclassmembers class com.myapp.models.** {
    <fields>;
}
```

### Wildcards

| Wildcard | Aplica a | Significado |
|----------|----------|-------------|
| `**` | Clases | Cualquier nombre incluyendo paquetes |
| `*` | Clases/Miembros | Cualquier parte sin separador de paquete |
| `?` | Clases/Miembros | Un solo carácter |
| `***` | Miembros | Cualquier tipo (primitivo, clase, array) |
| `...` | Miembros | Cualquier lista de parámetros |
| `%` | Miembros | Cualquier tipo primitivo |

### Tabla de Efectos

| Opción | Elimina Clases | Ofusca Clases | Elimina Miembros | Ofusca Miembros |
|--------|----------------|---------------|------------------|-----------------|
| `keep` | ❌ | ❌ | ❌ | ❌ |
| `keepclassmembers` | ✅ | ✅ | ❌ | ❌ |
| `keepclasseswithmembers` | ❌ | ❌ | ❌ | ❌ |
| `keepnames` | ✅ | ❌ | ✅ | ❌ |

### Best Practices

✅ **Hacer:**
```
# Usar anotaciones para marcar código que necesita conservarse
-keep @com.myapp.KeepMe class * { *; }

# Ser específico con los miembros
-keepclassmembers class com.myapp.Model {
    public java.lang.String getName();
}

# Usar keepclassmembers para máxima optimización
-keepclassmembers class * extends android.view.View {
    public <init>(android.content.Context, android.util.AttributeSet);
}
```

❌ **Evitar:**
```
# NO: Demasiado amplio
-keep class com.myapp.** { *; }

# NO: Usar operador de negación
-keep !class com.myapp.Internal { *; }

# NO: Reglas de paquete completo a largo plazo
-keep class com.thirdparty.** { *; }
```

---

## 5. Símbolos Nativos de Debug

### ¿Qué son?

Los símbolos de debug permiten traducir stack traces nativos (C/C++) a código legible con:
- Nombres de funciones
- Archivos fuente
- Números de línea

### Configuración

```kotlin
android {
    buildTypes {
        release {
            ndk {
                // FULL: nombres de función + archivo + línea
                // SYMBOL_TABLE: solo nombres de función (menor tamaño)
                debugSymbolLevel = "FULL"
            }
        }
    }
}
```

### Niveles de Símbolos

| Nivel | Incluye | Tamaño | Uso |
|-------|---------|--------|-----|
| `FULL` | Función + Archivo + Línea | Mayor | Debugging completo |
| `SYMBOL_TABLE` | Solo función | Menor | Cuando hay límite de tamaño |
| (ninguno) | Nada | Mínimo | No recomendado |

### Límite de Tamaño

⚠️ **Límite de Play Console: 300 MB** para archivo de símbolos

Si excede el límite, usar `SYMBOL_TABLE` en lugar de `FULL`.

### Ubicación del Archivo

**Para AAB (Android App Bundle):**
- Los símbolos se incluyen **automáticamente** en el AAB
- Play Console los extrae y usa automáticamente

**Para APK:**
- Ubicación: `app/build/outputs/native-debug-symbols/<variant>/native-debug-symbols.zip`
- Subir **manualmente** a Play Console

### Subir Símbolos Manualmente

1. Ir a Play Console → Tu app → Release → App bundle explorer
2. Seleccionar versión
3. Subir archivo `native-debug-symbols.zip`

### Apps Capacitor/Ionic

Para apps híbridas con SDKs nativos precompilados (Sentry, Facebook):

```
⚠️ Los símbolos de SDKs de terceros NO se pueden generar
   porque vienen precompilados. La advertencia de Play Console
   es informativa, no bloqueante.
```

**Soluciones:**
1. **Ignorar la advertencia** - La app se publica igual
2. **Contactar al proveedor del SDK** - Para obtener sus símbolos
3. **Desactivar componente nativo del SDK** - Si no es necesario

### ndk-stack Tool

Para simbolizar stack traces localmente:

```bash
# Pipe directo desde logcat
adb logcat | $NDK/ndk-stack -sym $PROJECT/obj/local/arm64-v8a

# Desde archivo
adb logcat > crash.txt
$NDK/ndk-stack -sym $PROJECT/obj/local/arm64-v8a -dump crash.txt
```

**Requisito:** El stack trace debe comenzar con:
```
*** *** *** *** *** *** *** *** *** *** *** *** *** *** *** ***
```

---

## 6. Baseline Profiles y DEX Layout

### ¿Qué son los Baseline Profiles?

Perfiles que indican a ART (Android Runtime) qué código compilar AOT (Ahead of Time) para mejor rendimiento de startup.

### Startup Profiles

Subconjunto de Baseline Profiles específico para inicialización:
- **15-30% más rápido** en startup vs solo Baseline Profiles
- Optimiza layout DEX para que código de startup esté en `classes.dex`

### Requisitos

- Jetpack Macrobenchmark 1.2.0+
- Android Gradle Plugin 8.2+
- Android Studio Iguana+
- R8 habilitado (`isMinifyEnabled = true`)

### Configuración

```kotlin
baselineProfile {
    dexLayoutOptimization = true
}
```

### Crear Startup Profile

```kotlin
@RunWith(AndroidJUnit4::class)
@LargeTest
class BaselineProfileGenerator {

    @get:Rule
    val rule = BaselineProfileRule()

    @Test
    fun generate() {
        rule.collect(
            packageName = "com.example.app",
            includeInStartupProfile = true  // Marca como crítico para startup
        ) {
            // Simular inicio de app
            startActivityIntent(Intent(Intent.ACTION_MAIN))

            // Simular navegación inicial
            device.wait(Until.hasObject(By.text("Home")), 5000)
        }
    }
}
```

### Consideraciones de DEX

- El código de startup debe caber en `classes.dex` (primer archivo DEX)
- Si overflow a `classes2.dex`, el beneficio se reduce
- Ordenar journeys por importancia: Launcher → Notificaciones → Otros

---

## 7. Troubleshooting

### Errores Comunes de Reflexión

Cuando la app crashea después de optimización, buscar:

| Excepción | Causa | Solución |
|-----------|-------|----------|
| `ClassNotFoundException` | Clase eliminada por R8 | Agregar keep rule |
| `NoSuchMethodException` | Método eliminado o renombrado | Agregar keep rule para método |
| `NoSuchFieldException` | Campo eliminado o renombrado | Agregar keep rule para campo |
| `NoClassDefFoundError` | Clase no disponible en runtime | Verificar dependencias |

### Señales de Reflexión en Código

```kotlin
import kotlin.reflect.*        // ⚠️ Usa reflexión
import java.lang.reflect.*     // ⚠️ Usa reflexión

Class.forName("...")           // ⚠️ Carga dinámica
classLoader.loadClass("...")   // ⚠️ Carga dinámica
Something::class.constructors  // ⚠️ Reflexión de constructores
```

### Herramienta Retrace

Para desofuscar stack traces:

```bash
# Comando
$ANDROID_HOME/cmdline-tools/latest/bin/retrace \
    app/build/outputs/mapping/release/mapping.txt \
    stacktrace.txt
```

**Importante:** Guardar `mapping.txt` de cada release publicado.

### Ver Reglas Combinadas

Revisar todas las keep rules activas (incluyendo de librerías):

```
./app/build/outputs/mapping/configuration.txt
```

### -whyareyoukeeping

Para entender por qué R8 conserva cierto código:

```
-whyareyoukeeping class com.myapp.SomeClass
```

Muestra el path desde el código conservado hasta entry points.

### Verificar Nombres Compilados

Para Kotlin, verificar nombres Java generados:

1. Android Studio → Analyze → Analyze APK → Show Bytecode
2. Tools → Kotlin → Show Kotlin Bytecode → Decompile

Ejemplo - función de paquete Kotlin:
```kotlin
// MyUtils.kt
package com.myapp.utils
fun isValid(s: String): Boolean = s.isNotEmpty()
```

Se compila a:
```java
// MyUtilsKt.class
public static boolean isValid(String s) { ... }
```

Keep rule:
```
-keep class com.myapp.utils.MyUtilsKt {
    public static boolean isValid(java.lang.String);
}
```

---

## 8. Testing de Optimización

### Estrategia de Testing

```
1. Habilitar R8
       ↓
2. Benchmarks locales (antes/después)
       ↓
3. Tests de UI (critical user journeys)
       ↓
4. Staged rollout (5% → 20% → 50% → 100%)
       ↓
5. Monitorear Android Vitals
       ↓
6. Watch for crash regressions
```

### Testing Local

#### Benchmarks
```kotlin
@RunWith(AndroidJUnit4::class)
class StartupBenchmark {
    @get:Rule
    val benchmarkRule = MacrobenchmarkRule()

    @Test
    fun startup() = benchmarkRule.measureRepeated(
        packageName = "com.myapp",
        metrics = listOf(StartupTimingMetric()),
        iterations = 5,
        startupMode = StartupMode.COLD
    ) {
        startActivityAndWait()
    }
}
```

#### UI Automator
```kotlin
@Test
fun criticalUserJourney() {
    // Launch app
    device.pressHome()
    device.wait(Until.hasObject(By.pkg("com.myapp")), 5000)

    // Perform critical actions
    device.findObject(By.text("Login")).click()
    device.findObject(By.res("email")).text = "test@test.com"
    device.findObject(By.res("submit")).click()

    // Verify result
    device.wait(Until.hasObject(By.text("Welcome")), 10000)
}
```

### Testing en Producción

1. **Staged Rollouts** - Publicar a % pequeño primero
2. **Android Vitals** - Monitorear crash rates
3. **Comparar métricas** - Antes vs después de optimización

---

## 9. Android Vitals y Crash Reporting

### Métricas de Crashes

| Métrica | Descripción | Umbral Malo |
|---------|-------------|-------------|
| **Crash Rate** | % de DAU con cualquier crash | - |
| **User-Perceived Crash Rate** | % de DAU con crash durante uso activo | ≥1.09% |
| **Per-Device Crash Rate** | % de DAU con crash en modelo específico | ≥8% |
| **Multiple Crash Rate** | % de DAU con 2+ crashes | - |

### Impacto en Play Store

- **≥1.09% user-perceived crash rate** → Menor visibilidad en búsquedas
- **≥8% per-device crash rate** → Menor visibilidad en ese dispositivo + advertencia en listing

### Prevenir NullPointerException

**Causa #1 de crashes en Google Play.**

#### En Kotlin
```kotlin
// Tipo no-nullable (no puede ser null)
var name: String = "John"

// Tipo nullable (requiere verificación)
var name: String? = null

// Safe call operator
val length = name?.length

// Elvis operator
val length = name?.length ?: 0

// EVITAR: assertion operator (puede crashear)
val length = name!!.length  // ⚠️ Peligroso
```

#### En Java
```java
// Anotaciones de nullability
public void process(@NonNull String text) { }

@Nullable
public String getValue() { return null; }

// Optional wrapper
public Optional<String> getValue() {
    return Optional.ofNullable(maybeNull);
}
```

### Lectura de Stack Traces

#### Java/Kotlin
```
java.lang.NullPointerException: Attempt to invoke method on null
    at com.myapp.MainActivity$1.onClick(MainActivity.java:27)
    at android.view.View.performClick(View.java:6134)
```

#### Nativo (C/C++)
```
signal 11 (SIGSEGV), code 1 (SEGV_MAPERR), fault addr 0x0
Cause: null pointer dereference
backtrace:
    #00 pc 0x42f89 /data/app/com.myapp/lib/arm64/libexample.so
```

---

## 10. Selección de Librerías

### Principio: Codegen > Reflexión

| Tipo | Ejemplos | Riesgo R8 |
|------|----------|-----------|
| **Codegen** | Room, Hilt, Kotlin Serialization | ✅ Bajo |
| **Reflexión** | Gson, algunos ORM legacy | ⚠️ Alto |

### Checklist de Evaluación

✅ **Elegir librerías que:**
- Usen code generation
- Tengan keep rules mínimas y específicas
- Sean parte de AndroidX
- No tengan issues de optimización reportados

❌ **Evitar librerías que:**
- Requieran copiar/pegar keep rules de documentación
- Tengan keep rules de paquete completo (`-keep class lib.** { *; }`)
- Usen reflexión extensivamente
- Tengan issues abiertos sobre minificación

### Caso de Estudio: Gson

**Problema:**
```kotlin
// Gson usa reflexión para deserializar
Gson().fromJson(json, User::class.java)
```

R8 no ve `User` instanciado explícitamente → elimina/renombra campos → crash en runtime.

**Alternativas:**
- **Kotlin Serialization** - Codegen, null-safe
- **Moshi with codegen** - Generación de adaptadores
- **Protocol Buffers** - Codegen + eficiente

### Filtrar Keep Rules de Librerías

```kotlin
// AGP 8.4+
buildTypes {
    release {
        optimization.keepRules {
            it.ignoreFrom("com.problematic:library")
        }
    }
}

// AGP 7.3-8.3
buildTypes {
    release {
        optimization.keepRules {
            it.ignoreExternalDependencies("com.problematic:library")
        }
    }
}
```

---

## 11. Adopción Incremental

### Fase 1: Solo Tree Shaking

```
# proguard-rules.pro
-dontobfuscate     # Desactivar ofuscación temporalmente
-dontoptimize      # Desactivar optimización temporalmente
```

**Beneficios:**
- Stack traces legibles
- Menor riesgo de romper funcionalidad
- Prueba el concepto básico

### Fase 2: Compat Mode

```properties
# gradle.properties
android.enableR8.fullMode=false
```

### Fase 3: Full Mode

Eliminar las líneas anteriores y habilitar todo:

```kotlin
release {
    isMinifyEnabled = true
    isShrinkResources = true
    // Sin -dontobfuscate ni -dontoptimize
}
```

### Limitar Scope Temporalmente

Si hay problemas con cierto código:

```
# Temporal - aislar código problemático
-keep class com.myapp.problematic.** { *; }
```

Luego refinar con keep rules específicas.

### Timeline Recomendado

| Semana | Acción |
|--------|--------|
| 1 | Habilitar tree shaking, testear localmente |
| 2 | Agregar keep rules necesarias |
| 3 | Habilitar ofuscación, testear |
| 4 | Staged rollout 5% |
| 5 | Incrementar a 20%, monitorear vitals |
| 6 | Full rollout si métricas OK |

---

## 12. Checklist para Play Store

### Pre-Publicación

- [ ] `isMinifyEnabled = true` en release
- [ ] `isShrinkResources = true` en release
- [ ] `debugSymbolLevel = "FULL"` o `"SYMBOL_TABLE"`
- [ ] Probar todas las features con build release
- [ ] Verificar que no hay crashes de reflexión
- [ ] Guardar copia de `mapping.txt`
- [ ] Tests de UI passing con build release
- [ ] Baseline Profiles generados (opcional pero recomendado)

### Build

- [ ] Build release exitoso sin warnings críticos
- [ ] Tamaño de APK/AAB razonable
- [ ] Símbolos nativos < 300 MB
- [ ] AAB firmado correctamente

### Post-Publicación

- [ ] Staged rollout configurado (empezar con 5-10%)
- [ ] Monitorear Android Vitals durante rollout
- [ ] Verificar crash rate no aumenta
- [ ] Responder a crashes nuevos relacionados con R8

### Archivos a Conservar por Release

```
release-v1.0.0/
├── app-release.aab
├── mapping.txt              # Para desofuscar crashes
├── seeds.txt                # Código conservado
├── usage.txt                # Código eliminado
└── native-debug-symbols.zip # Para crashes nativos
```

---

## 13. Configuración para Capacitor/Ionic

### build.gradle típico

```groovy
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'

            ndk {
                debugSymbolLevel 'FULL'
            }

            signingConfig signingConfigs.release
        }
    }
}
```

### proguard-rules.pro para Capacitor

```
# Capacitor
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-dontwarn com.getcapacitor.**

# Cordova plugins (si usas)
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# WebView
-keepattributes JavascriptInterface
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
}
```

### Plugins Comunes

```
# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Facebook SDK
-keep class com.facebook.** { *; }
-dontwarn com.facebook.**

# Sentry
-keep class io.sentry.** { *; }
-dontwarn io.sentry.**

# Google Play Services
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
```

### Símbolos Nativos en Capacitor

Para apps Capacitor, los `.so` files típicamente vienen de:
- Sentry SDK
- Facebook SDK
- Firebase
- Otros SDKs nativos

**Importante:** Los símbolos de estos SDKs NO se pueden generar localmente porque vienen precompilados. La advertencia de Play Console sobre símbolos faltantes es **informativa, no bloqueante**.

---

## Recursos Adicionales

### Documentación Oficial
- [Enable App Optimization](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization)
- [Keep Rules Overview](https://developer.android.com/topic/performance/app-optimization/keep-rules-overview)
- [Include Native Symbols](https://developer.android.com/build/include-native-symbols)
- [Baseline Profiles](https://developer.android.com/topic/performance/baselineprofiles/overview)
- [Android Vitals](https://developer.android.com/topic/performance/vitals)

### Herramientas
- [R8 Bug Tracker](https://issuetracker.google.com/issues?q=componentid:326788)
- [APK Analyzer](https://developer.android.com/studio/debug/apk-analyzer)
- [ndk-stack](https://developer.android.com/ndk/guides/ndk-stack)

### Comunidad
- [Play Console Help - Deobfuscation](https://support.google.com/googleplay/android-developer/answer/9848633)

---

**Documento generado:** 2026-01-30
**Versión:** 1.0
**Mantenedor:** AutoRenta Team
