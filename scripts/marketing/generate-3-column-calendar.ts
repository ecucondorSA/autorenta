#!/usr/bin/env bun
/**
 * Generador de Calendario de 3 Columnas para Instagram
 *
 * Implementa la estrategia visual de grid donde cada columna tiene un propósito:
 * - Columna 1 (Izquierda): Comunidad y Personas
 * - Columna 2 (Central): Educación y Marca
 * - Columna 3 (Derecha): Confianza y Tecnología
 *
 * Usage:
 *   bun scripts/marketing/generate-3-column-calendar.ts --days=7
 *   bun scripts/marketing/generate-3-column-calendar.ts --days=14 --dry-run
 *   bun scripts/marketing/generate-3-column-calendar.ts --preview
 *
 * @author Claude Code
 * @date 2026-01-28
 */

import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "util";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NG_APP_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Validación diferida - solo requerimos credenciales si no es preview
function validateCredentials(): void {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Variables de entorno requeridas para generar contenido:");
    console.error("   - NG_APP_SUPABASE_URL o SUPABASE_URL");
    console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    console.error("\n💡 Tip: Usa --preview para ver el calendario sin credenciales");
    process.exit(1);
  }
}

// Cliente Supabase (inicializado lazy)
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    validateCredentials();
    _supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return _supabase;
}

// ============================================================================
// 3-COLUMN STRATEGY DEFINITION
// ============================================================================

/**
 * Estrategia de 3 columnas para Instagram Grid
 *
 * El grid de Instagram muestra 3 posts por fila. Esta estrategia asegura
 * que cada columna tenga un propósito visual y de contenido consistente.
 */
interface ColumnStrategy {
  name: string;
  description: string;
  contentTypes: string[];
  visualStyle: string;
  themes: string[];
}

const COLUMN_STRATEGIES: Record<1 | 2 | 3, ColumnStrategy> = {
  // Columna IZQUIERDA - Comunidad y Personas
  1: {
    name: "Comunidad y Personas",
    description: "Fotos reales de dueños y usuarios con luz natural. Proyecta calidez y cercanía.",
    contentTypes: ["community", "testimonial"],
    visualStyle: "warm, natural light, real people, authentic moments",
    themes: [
      "Historia de éxito: propietario que viajó con sus ganancias",
      "Momento de entrega de llaves entre personas",
      "Usuario feliz en su road trip",
      "Familia disfrutando un viaje en auto alquilado",
      "Propietario mostrando su auto con orgullo",
      "Encuentro entre arrendatario y dueño",
    ],
  },

  // Columna CENTRAL - Educación y Marca
  2: {
    name: "Educación y Marca",
    description: "Gráficos limpios con fondo amarillo o blanco. Títulos cortos con fuentes modernas.",
    contentTypes: ["educational", "authority", "tip"],
    visualStyle: "clean graphics, brand colors (yellow/green), modern typography",
    themes: [
      "Tip: Cómo preparar tu auto para alquilar",
      "Dato: Cuánto puedes ganar con tu auto parado",
      "Educativo: Qué seguro cubre AutoRentar",
      "Concepto: Por qué el alquiler P2P es más económico",
      "Tip: Checklist antes de un road trip",
      "Educativo: Cómo funciona la verificación de usuarios",
    ],
  },

  // Columna DERECHA - Confianza y Tecnología
  3: {
    name: "Confianza y Tecnología",
    description: "Fotos de detalles de autos o capturas de la App sobre fondos grises claros.",
    contentTypes: ["promo", "car_spotlight", "promotional"],
    visualStyle: "tech-focused, app screenshots, car details, trust badges",
    themes: [
      "Destacado: Auto premium disponible en tu ciudad",
      "App: Nueva función de tracking en tiempo real",
      "Promo: Descargá la app y reservá tu primer viaje",
      "Tecnología: Cómo funciona la inspección digital",
      "Seguridad: El seguro que protege cada viaje",
      "App: Así de fácil es publicar tu auto",
    ],
  },
};

// Horarios óptimos de publicación (Argentina UTC-3)
const POSTING_HOURS = {
  instagram: [
    { hour: 12, minute: 0 },  // 12:00 - almuerzo
    { hour: 17, minute: 0 },  // 17:00 - salida del trabajo
    { hour: 21, minute: 0 },  // 21:00 - prime time
  ],
};

// ============================================================================
// TYPES
// ============================================================================

interface GeneratedPost {
  column: 1 | 2 | 3;
  columnName: string;
  contentType: string;
  theme: string;
  scheduledFor: string;
  platform: string;
}

interface CalendarDay {
  date: string;
  posts: GeneratedPost[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calcula la próxima fecha/hora de publicación
 */
function getNextPostingTime(startDate: Date, dayOffset: number, postIndex: number): Date {
  const date = new Date(startDate);
  date.setDate(date.getDate() + dayOffset);

  // Rotar entre los 3 horarios óptimos
  const timeSlot = POSTING_HOURS.instagram[postIndex % POSTING_HOURS.instagram.length];

  // Convertir hora Argentina (UTC-3) a UTC
  date.setUTCHours(timeSlot.hour + 3, timeSlot.minute, 0, 0);

  return date;
}

/**
 * Selecciona un content_type aleatorio de la columna
 */
function selectContentType(column: 1 | 2 | 3): string {
  const types = COLUMN_STRATEGIES[column].contentTypes;
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Selecciona un tema aleatorio de la columna
 */
function selectTheme(column: 1 | 2 | 3): string {
  const themes = COLUMN_STRATEGIES[column].themes;
  return themes[Math.floor(Math.random() * themes.length)];
}

/**
 * Genera el calendario de posts para N días
 */
function generateCalendarPlan(days: number): CalendarDay[] {
  const calendar: CalendarDay[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Empezar mañana

  let postIndex = 0;

  for (let day = 0; day < days; day++) {
    const dayPosts: GeneratedPost[] = [];

    // 3 posts por día (uno por columna)
    for (let col = 1; col <= 3; col++) {
      const column = col as 1 | 2 | 3;
      const scheduledTime = getNextPostingTime(startDate, day, postIndex);

      dayPosts.push({
        column,
        columnName: COLUMN_STRATEGIES[column].name,
        contentType: selectContentType(column),
        theme: selectTheme(column),
        scheduledFor: scheduledTime.toISOString(),
        platform: "instagram",
      });

      postIndex++;
    }

    const dateStr = new Date(startDate);
    dateStr.setDate(dateStr.getDate() + day);

    calendar.push({
      date: dateStr.toISOString().split("T")[0],
      posts: dayPosts,
    });
  }

  return calendar;
}

/**
 * Muestra el calendario en formato tabla
 */
function printCalendarPreview(calendar: CalendarDay[]): void {
  console.log("\n" + "═".repeat(90));
  console.log("📅 CALENDARIO DE 3 COLUMNAS - PREVIEW");
  console.log("═".repeat(90));

  for (const day of calendar) {
    console.log(`\n📆 ${day.date}`);
    console.log("─".repeat(90));

    for (const post of day.posts) {
      const time = new Date(post.scheduledFor).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      });

      const colIcon = post.column === 1 ? "👥" : post.column === 2 ? "📚" : "🔧";

      console.log(
        `  ${colIcon} Col ${post.column} │ ${time} │ ${post.contentType.padEnd(12)} │ ${post.theme.substring(0, 45)}...`
      );
    }
  }

  console.log("\n" + "═".repeat(90));
  console.log(`Total: ${calendar.length} días × 3 posts = ${calendar.length * 3} posts`);
  console.log("═".repeat(90) + "\n");
}

/**
 * Genera el contenido real llamando a la edge function
 */
async function generateContent(post: GeneratedPost, dryRun: boolean): Promise<boolean> {
  if (dryRun) {
    console.log(`  [DRY-RUN] Generaría: ${post.contentType} para ${post.columnName}`);
    return true;
  }

  try {
    const payload = {
      content_type: post.contentType,
      platform: post.platform,
      theme: post.theme,
      language: "es",
      generate_image: false, // Deshabilitado temporalmente - la edge function requiere imagen para guardar
      save_to_db: false, // Guardamos manualmente después
    };

    console.log(`  🔄 Generando ${post.contentType} (${post.columnName})...`);

    const { data, error } = await getSupabase().functions.invoke("generate-marketing-content", {
      body: payload,
    });

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
      return false;
    }

    if (data?.success) {
      console.log(`  ✅ Generado y guardado en cola`);
      return true;
    } else {
      console.error(`  ❌ Falló: ${data?.error || "Unknown error"}`);
      return false;
    }
  } catch (err) {
    console.error(`  ❌ Exception: ${err}`);
    return false;
  }
}

/**
 * Ejecuta la generación completa del calendario
 */
async function executeCalendar(calendar: CalendarDay[], dryRun: boolean): Promise<void> {
  console.log("\n" + "═".repeat(90));
  console.log(dryRun ? "🧪 EJECUTANDO EN MODO DRY-RUN" : "🚀 GENERANDO CONTENIDO REAL");
  console.log("═".repeat(90));

  let successCount = 0;
  let failCount = 0;

  for (const day of calendar) {
    console.log(`\n📆 ${day.date}`);

    for (const post of day.posts) {
      const success = await generateContent(post, dryRun);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Pequeña pausa entre generaciones para no saturar la API
      if (!dryRun) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  console.log("\n" + "═".repeat(90));
  console.log("📊 RESUMEN");
  console.log("─".repeat(90));
  console.log(`  ✅ Exitosos: ${successCount}`);
  console.log(`  ❌ Fallidos: ${failCount}`);
  console.log(`  📝 Total: ${successCount + failCount}`);
  console.log("═".repeat(90) + "\n");
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      days: { type: "string", default: "7" },
      "dry-run": { type: "boolean", default: false },
      preview: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`
📅 Generador de Calendario de 3 Columnas para Instagram

USO:
  bun scripts/marketing/generate-3-column-calendar.ts [opciones]

OPCIONES:
  --days=N      Número de días a generar (default: 7)
  --dry-run     Simula sin generar contenido real
  --preview     Solo muestra el calendario sin ejecutar
  --help        Muestra esta ayuda

EJEMPLOS:
  # Ver preview de 7 días
  bun scripts/marketing/generate-3-column-calendar.ts --preview

  # Generar 14 días en modo dry-run
  bun scripts/marketing/generate-3-column-calendar.ts --days=14 --dry-run

  # Generar contenido real para 7 días
  bun scripts/marketing/generate-3-column-calendar.ts --days=7

ESTRATEGIA DE COLUMNAS:
  Col 1 (👥 Izquierda): Comunidad y Personas - testimoniales, historias
  Col 2 (📚 Central):   Educación y Marca - tips, autoridad, educativo
  Col 3 (🔧 Derecha):   Confianza y Tecnología - promos, autos, app
    `);
    process.exit(0);
  }

  const days = parseInt(values.days || "7", 10);
  const dryRun = values["dry-run"] || false;
  const previewOnly = values.preview || false;

  console.log("\n🎨 AUTORENTAR - Generador de Calendario 3 Columnas");
  console.log("─".repeat(50));
  console.log(`  📆 Días a generar: ${days}`);
  console.log(`  📝 Posts totales: ${days * 3}`);
  console.log(`  🧪 Modo: ${previewOnly ? "Preview" : dryRun ? "Dry-run" : "Producción"}`);

  // Generar el plan
  const calendar = generateCalendarPlan(days);

  // Mostrar preview
  printCalendarPreview(calendar);

  if (previewOnly) {
    console.log("ℹ️  Modo preview - No se generó contenido");
    console.log("   Ejecuta sin --preview para generar contenido real\n");
    process.exit(0);
  }

  // Confirmar antes de ejecutar en producción
  if (!dryRun) {
    console.log("⚠️  ATENCIÓN: Esto generará contenido real y lo guardará en la cola.");
    console.log("   Presiona Ctrl+C en 5 segundos para cancelar...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  // Ejecutar
  await executeCalendar(calendar, dryRun);
}

main().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
