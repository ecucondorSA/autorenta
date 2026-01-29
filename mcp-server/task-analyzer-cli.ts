#!/usr/bin/env node

/**
 * Task Completion Analyzer CLI
 * Ayuda a identificar tareas pendientes y qué falta para completar el 100% del código
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface TaskAnalysis {
  title: string;
  description: string;
  priority: string;
  category: string;
  file: string;
  line: number;
  estimatedHours: number;
}

class TaskAnalyzerCLI {
  private projectRoot: string;
  private tasks: TaskAnalysis[] = [];
  private categories: Record<string, TaskAnalysis[]> = {};
  private priorities: Record<string, TaskAnalysis[]> = {};

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Analizar TODO, FIXME, XXX en el proyecto
   */
  analyzeProject(): void {
    console.log("\n🔍 Analizando proyecto...\n");

    const patterns = [
      { regex: /\/\/\s*TODO[:\s](.+?)(?=\n|$)/gi, type: "TODO" },
      { regex: /\/\/\s*FIXME[:\s](.+?)(?=\n|$)/gi, type: "FIXME" },
      { regex: /\/\/\s*XXX[:\s](.+?)(?=\n|$)/gi, type: "XXX" },
      { regex: /\/\*\s*TODO[:\s]([\s\S]*?)\*\//gi, type: "TODO" },
    ];

    const extensions = [".ts", ".tsx", ".js", ".jsx", ".sql"];
    const excludeDirs = ["node_modules", ".git", "dist", "build", ".angular"];

    const findFiles = (dir: string): string[] => {
      let files: string[] = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (excludeDirs.includes(entry.name)) continue;
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files = files.concat(findFiles(fullPath));
          } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch {
        //
      }
      return files;
    };

    const files = findFiles(this.projectRoot);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const { regex, type } of patterns) {
            let match;
            while ((match = regex.exec(line)) !== null) {
              const description = match[1].trim();
              const relativePath = path.relative(this.projectRoot, file);

              const task: TaskAnalysis = {
                title: this.extractTitle(description),
                description,
                priority: this.extractPriority(description),
                category: this.categorizeTask(description, relativePath),
                file: relativePath,
                line: i + 1,
                estimatedHours: this.estimateHours(description),
              };

              this.tasks.push(task);

              // Organizar por categoría y prioridad
              if (!this.categories[task.category])
                this.categories[task.category] = [];
              this.categories[task.category].push(task);

              if (!this.priorities[task.priority])
                this.priorities[task.priority] = [];
              this.priorities[task.priority].push(task);
            }
          }
        }
      } catch {
        //
      }
    }

    this.printSummary();
  }

  /**
   * Extraer título de la tarea
   */
  private extractTitle(description: string): string {
    return description.split("\n")[0].substring(0, 70);
  }

  /**
   * Extraer prioridad
   */
  private extractPriority(description: string): string {
    if (/CRITICAL|URGENT|BLOCKER|P0/i.test(description)) return "P0 🔴";
    if (/HIGH|IMPORTANT|P1/i.test(description)) return "P1 🟠";
    if (/MEDIUM|P2/i.test(description)) return "P2 🔵";
    return "P3 🟢";
  }

  /**
   * Estimar horas
   */
  private estimateHours(description: string): number {
    if (/QUICK|MINOR|SIMPLE|FIX/i.test(description)) return 0.5;
    if (/MEDIUM|MODERATE|IMPLEMENT/i.test(description)) return 4;
    if (/COMPLEX|REFACTOR|REWRITE/i.test(description)) return 16;
    if (/MAJOR|OVERHAUL|REDESIGN/i.test(description)) return 32;
    return 2;
  }

  /**
   * Categorizar tarea
   */
  private categorizeTask(description: string, file: string): string {
    if (/test|spec/i.test(file)) return "🧪 Testing";
    if (/migration|schema|sql|database/i.test(file)) return "🗄️ Database";
    if (/component|page|template|html|ui/i.test(file)) return "🎨 Frontend";
    if (/service|api|http|request/i.test(description)) return "🔌 API";
    if (/security|auth|permission|rls/i.test(description))
      return "🔐 Security";
    if (/performance|optimize|cache|memory/i.test(description))
      return "⚡ Performance";
    if (/widget|component|button|form/i.test(description)) return "🎨 UI/UX";
    return "⚙️ Feature";
  }

  /**
   * Imprimir resumen
   */
  private printSummary(): void {
    console.log(
      "╔════════════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║           📊 ANÁLISIS DE TAREAS PENDIENTES - AUTORENTA            ║"
    );
    console.log(
      "╚════════════════════════════════════════════════════════════════════╝\n"
    );

    const totalHours = this.tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const totalDays = Math.round(totalHours / 8);

    console.log("📈 ESTADÍSTICAS GENERALES");
    console.log("─────────────────────────────────────────────────────────");
    console.log(`  Total de tareas encontradas: ${this.tasks.length}`);
    console.log(`  Horas estimadas: ${totalHours}h`);
    console.log(`  Días estimados: ${totalDays} días (8h/día)`);
    console.log(
      `  Semanas estimadas: ${Math.ceil(totalDays / 5)} semanas (5d/semana)\n`
    );

    // Por prioridad
    console.log("📋 POR PRIORIDAD");
    console.log("─────────────────────────────────────────────────────────");
    const sortedPriorities = Object.entries(this.priorities).sort(
      (a, b) => b[1].length - a[1].length
    );
    for (const [priority, tasks] of sortedPriorities) {
      const hours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      console.log(
        `  ${priority}: ${tasks.length} tareas (${hours}h)`
      );
    }

    // Por categoría
    console.log("\n🏷️  POR CATEGORÍA");
    console.log("─────────────────────────────────────────────────────────");
    const sortedCategories = Object.entries(this.categories).sort(
      (a, b) => b[1].length - a[1].length
    );
    for (const [category, tasks] of sortedCategories) {
      const hours = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
      console.log(`  ${category}: ${tasks.length} tareas (${hours}h)`);
    }

    // Top 10 tareas más costosas
    console.log("\n⏱️  TOP 10 TAREAS MÁS COSTOSAS");
    console.log("─────────────────────────────────────────────────────────");
    const sorted = [...this.tasks].sort(
      (a, b) => b.estimatedHours - a.estimatedHours
    );
    sorted.slice(0, 10).forEach((task, i) => {
      console.log(`  ${i + 1}. [${task.estimatedHours}h] ${task.title}`);
      console.log(
        `     📁 ${task.file}:${task.line} | ${task.category} | ${task.priority}`
      );
    });

    // Críticas
    const critical = this.priorities["P0 🔴"] || [];
    if (critical.length > 0) {
      console.log("\n🚨 CRÍTICAS (P0) - HACER PRIMERO");
      console.log("─────────────────────────────────────────────────────────");
      critical.slice(0, 5).forEach((task, i) => {
        console.log(`  ${i + 1}. ${task.title}`);
        console.log(
          `     📁 ${task.file}:${task.line} | ${task.estimatedHours}h`
        );
      });
    }

    // Comandos útiles
    console.log("\n🛠️  COMANDOS ÚTILES");
    console.log("─────────────────────────────────────────────────────────");
    console.log(
      `  npm run test:e2e              # Ejecutar tests E2E`
    );
    console.log(`  npm run lint                  # Verificar linting`);
    console.log(`  npm run build                 # Build del proyecto`);
    console.log(`  npm run dev:web               # Iniciar dev server`);

    console.log(
      "\n✅ Reporte completo en: /home/edu/autorenta/task-completion-report.html"
    );
  }

  /**
   * Mostrar tareas de una categoría
   */
  showCategory(categoryPrefix: string): void {
    const category = Object.keys(this.categories).find((c) =>
      c.toLowerCase().includes(categoryPrefix.toLowerCase())
    );

    if (!category) {
      console.log(`❌ Categoría no encontrada. Disponibles:`);
      Object.keys(this.categories).forEach((c) => console.log(`  - ${c}`));
      return;
    }

    const tasks = this.categories[category];
    console.log(
      `\n📂 ${category} (${tasks.length} tareas)\n─────────────────────────────`
    );
    tasks.forEach((task, i) => {
      console.log(`${i + 1}. ${task.title}`);
      console.log(`   Prioridad: ${task.priority}`);
      console.log(`   Archivo: ${task.file}:${task.line}`);
      console.log(`   Estimado: ${task.estimatedHours}h\n`);
    });
  }

  /**
   * Mostrar tareas de una prioridad
   */
  showPriority(priority: string): void {
    const key = Object.keys(this.priorities).find((k) =>
      k.includes(priority.toUpperCase())
    );

    if (!key) {
      console.log(
        `❌ Prioridad no encontrada. Usa: P0, P1, P2 o P3`
      );
      return;
    }

    const tasks = this.priorities[key];
    console.log(`\n${key} (${tasks.length} tareas)\n─────────────────────────────`);
    tasks.forEach((task, i) => {
      console.log(`${i + 1}. ${task.title}`);
      console.log(`   Categoría: ${task.category}`);
      console.log(`   Archivo: ${task.file}:${task.line}`);
      console.log(`   Estimado: ${task.estimatedHours}h\n`);
    });
  }
}

// Main CLI
const args = process.argv.slice(2);
const projectRoot =
  args.find((arg) => !arg.startsWith("--")) || process.cwd();
const analyzer = new TaskAnalyzerCLI(projectRoot);

analyzer.analyzeProject();

// Comandos adicionales
if (args.includes("--category")) {
  const categoryIdx = args.indexOf("--category");
  if (categoryIdx < args.length - 1) {
    analyzer.showCategory(args[categoryIdx + 1]);
  }
}

if (args.includes("--priority")) {
  const priorityIdx = args.indexOf("--priority");
  if (priorityIdx < args.length - 1) {
    analyzer.showPriority(args[priorityIdx + 1]);
  }
}

if (args.includes("--help")) {
  console.log(`
Task Analyzer CLI - Identifica tareas pendientes en tu proyecto

Uso:
  npx ts-node task-analyzer-cli.ts [ruta] [opciones]

Opciones:
  --category <nombre>     Mostrar tareas de una categoría
  --priority <P0|P1|P2|P3>  Mostrar tareas de una prioridad
  --help                  Mostrar esta ayuda

Ejemplos:
  npx ts-node task-analyzer-cli.ts /home/edu/autorenta
  npx ts-node task-analyzer-cli.ts /home/edu/autorenta --category testing
  npx ts-node task-analyzer-cli.ts /home/edu/autorenta --priority P0
  `);
}
