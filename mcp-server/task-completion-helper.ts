#!/usr/bin/env node

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface Task {
  id: string;
  title: string;
  description: string;
  priority: "P0" | "P1" | "P2" | "P3";
  status: "pending" | "in-progress" | "blocked" | "completed";
  file: string;
  line: number;
  estimatedHours: number;
  category: string;
  dependencies: string[];
}

interface CompletionReport {
  totalTasks: number;
  completedTasks: number;
  percentageComplete: number;
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
  tasksByCategory: Record<string, number>;
  criticalBlockers: Task[];
  estimatedTimeToCompletion: number;
  recommendations: string[];
  nextSteps: Task[];
}

class TaskCompletionMCP {
  private projectRoot: string;
  private client: Anthropic;
  private tasks: Task[] = [];

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.client = new Anthropic();
  }

  /**
   * Scan project for TODO, FIXME, and XXX comments
   */
  async scanForTasks(): Promise<Task[]> {
    const patterns = [
      /\/\/\s*TODO[:\s](.+?)(?=\n|$)/gi,
      /\/\/\s*FIXME[:\s](.+?)(?=\n|$)/gi,
      /\/\/\s*XXX[:\s](.+?)(?=\n|$)/gi,
      /\/\*\s*TODO[:\s]([\s\S]*?)\*\//gi,
      /\/\*\s*FIXME[:\s]([\s\S]*?)\*\//gi,
    ];

    const extensions = [".ts", ".tsx", ".js", ".jsx", ".sql", ".py"];
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
      } catch (e) {
        // Skip inaccessible directories
      }
      return files;
    };

    const files = findFiles(this.projectRoot);
    let taskId = 1;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf-8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(line)) !== null) {
              const description = match[1].trim();
              const relativePath = path.relative(this.projectRoot, file);

              this.tasks.push({
                id: `TASK-${taskId++}`,
                title: this.extractTitle(description),
                description: description,
                priority: this.extractPriority(description),
                status: "pending",
                file: relativePath,
                line: i + 1,
                estimatedHours: this.estimateHours(description),
                category: this.categorizeTask(description, relativePath),
                dependencies: this.extractDependencies(description),
              });
            }
          }
        }
      } catch (e) {
        // Skip unreadable files
      }
    }

    return this.tasks;
  }

  /**
   * Extract title from TODO comment
   */
  private extractTitle(description: string): string {
    return description.split("\n")[0].substring(0, 60);
  }

  /**
   * Determine priority from keywords
   */
  private extractPriority(description: string): "P0" | "P1" | "P2" | "P3" {
    if (/CRITICAL|URGENT|BLOCKER|P0/i.test(description)) return "P0";
    if (/HIGH|IMPORTANT|P1/i.test(description)) return "P1";
    if (/MEDIUM|P2/i.test(description)) return "P2";
    return "P3";
  }

  /**
   * Estimate hours based on keywords
   */
  private estimateHours(description: string): number {
    if (/QUICK|MINOR|SIMPLE/i.test(description)) return 0.5;
    if (/MEDIUM|MODERATE/i.test(description)) return 4;
    if (/COMPLEX|REFACTOR|REWRITE/i.test(description)) return 16;
    if (/MAJOR|OVERHAUL/i.test(description)) return 32;
    return 2;
  }

  /**
   * Categorize task by type and location
   */
  private categorizeTask(description: string, file: string): string {
    if (/test|spec/i.test(file)) return "Testing";
    if (/migration|schema|sql/i.test(file)) return "Database";
    if (/component|page|template|html/i.test(file)) return "Frontend";
    if (/service|api|http|request/i.test(description)) return "API";
    if (/security|auth|permission|rls/i.test(description)) return "Security";
    if (/performance|optimize|cache|memory/i.test(description)) return "Performance";
    if (/ui|ux|design|button|form/i.test(description)) return "UI/UX";
    return "Feature";
  }

  /**
   * Extract dependencies from comment
   */
  private extractDependencies(description: string): string[] {
    const deps: string[] = [];
    const depPattern = /depends on|requires|blocked by|after\s+(\w+)/gi;
    let match;
    while ((match = depPattern.exec(description)) !== null) {
      if (match[1]) deps.push(match[1]);
    }
    return deps;
  }

  /**
   * Get git status for more context
   */
  private getGitStatus(): {
    branches: string[];
    uncommitted: number;
    untracked: number;
  } {
    try {
      const status = execSync("git status --porcelain", {
        cwd: this.projectRoot,
        encoding: "utf-8",
      });
      const lines = status.split("\n").filter((l) => l.trim());
      const untracked = lines.filter((l) => l.startsWith("??")).length;
      const uncommitted = lines.filter((l) => !l.startsWith("??")).length;

      const branches = execSync("git branch -a", {
        cwd: this.projectRoot,
        encoding: "utf-8",
      })
        .split("\n")
        .filter((b) => b.trim() && b.includes("*"))
        .map((b) => b.replace("*", "").trim());

      return { branches, uncommitted, untracked };
    } catch {
      return { branches: [], uncommitted: 0, untracked: 0 };
    }
  }

  /**
   * Generate completion report
   */
  async generateReport(): Promise<CompletionReport> {
    const completed = this.tasks.filter((t) => t.status === "completed").length;
    const total = this.tasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const tasksByPriority: Record<string, number> = {
      P0: 0,
      P1: 0,
      P2: 0,
      P3: 0,
    };
    const tasksByStatus: Record<string, number> = {
      pending: 0,
      "in-progress": 0,
      blocked: 0,
      completed: 0,
    };
    const tasksByCategory: Record<string, number> = {};

    for (const task of this.tasks) {
      tasksByPriority[task.priority]++;
      tasksByStatus[task.status]++;
      tasksByCategory[task.category] =
        (tasksByCategory[task.category] || 0) + 1;
    }

    const criticalBlockers = this.tasks.filter((t) => t.priority === "P0");
    const totalHours = this.tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    const completedHours = this.tasks
      .filter((t) => t.status === "completed")
      .reduce((sum, t) => sum + t.estimatedHours, 0);
    const remainingHours = totalHours - completedHours;

    const nextSteps = this.getNextSteps();
    const recommendations = await this.generateRecommendations();

    return {
      totalTasks: total,
      completedTasks: completed,
      percentageComplete: percentage,
      tasksByPriority,
      tasksByStatus,
      tasksByCategory,
      criticalBlockers,
      estimatedTimeToCompletion: remainingHours,
      recommendations,
      nextSteps,
    };
  }

  /**
   * Determine next steps based on dependencies and priority
   */
  private getNextSteps(): Task[] {
    return this.tasks
      .filter((t) => t.status === "pending" && t.priority === "P0")
      .sort((a, b) => b.estimatedHours - a.estimatedHours)
      .slice(0, 5);
  }

  /**
   * Use Claude to generate recommendations
   */
  private async generateRecommendations(): Promise<string[]> {
    const taskSummary = this.tasks
      .filter((t) => t.status === "pending")
      .map((t) => `${t.priority}: ${t.title} (${t.category})`)
      .join("\n");

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `Eres un experto en gestión de proyectos de software. Analiza estas tareas pendientes y proporciona 5 recomendaciones concretas para completar el proyecto más rápido:

${taskSummary}

Responde en formato de lista numerada con recomendaciones prácticas y accionables.`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        return content.text
          .split("\n")
          .filter((line) => line.trim() && /^\d+\./.test(line))
          .map((line) => line.replace(/^\d+\.\s*/, ""));
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
    }

    return [];
  }

  /**
   * Generate detailed HTML report
   */
  async generateHTMLReport(outputPath: string): Promise<void> {
    const report = await this.generateReport();
    const gitStatus = this.getGitStatus();

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Autorenta - Reporte de Tareas Pendientes</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
        h1 { font-size: 2.5em; margin-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-card h3 { color: #667eea; font-size: 0.9em; text-transform: uppercase; margin-bottom: 10px; }
        .stat-card .value { font-size: 2.5em; font-weight: bold; color: #333; }
        .stat-card .unit { font-size: 0.8em; color: #999; margin-left: 5px; }
        .progress-bar { width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width 0.3s; }
        .section { background: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .section h2 { color: #333; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .task-list { list-style: none; }
        .task-item { padding: 15px; border-left: 4px solid #667eea; background: #f9f9f9; margin-bottom: 10px; border-radius: 4px; }
        .task-item.p0 { border-left-color: #ff6b6b; }
        .task-item.p1 { border-left-color: #ffa500; }
        .task-item.p2 { border-left-color: #4ecdc4; }
        .task-item.p3 { border-left-color: #95e1d3; }
        .task-priority { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; margin-right: 10px; }
        .priority-p0 { background: #ffebee; color: #c62828; }
        .priority-p1 { background: #fff3e0; color: #e65100; }
        .priority-p2 { background: #e0f2f1; color: #00695c; }
        .priority-p3 { background: #f1f8e9; color: #33691e; }
        .task-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; background: #e3f2fd; color: #1565c0; }
        .task-file { font-size: 0.85em; color: #999; margin-top: 8px; font-family: monospace; }
        .chart { margin: 20px 0; }
        .chart-bar { display: flex; align-items: center; margin-bottom: 15px; }
        .chart-label { width: 150px; font-weight: bold; }
        .chart-value { flex: 1; background: #e0e0e0; height: 30px; border-radius: 4px; position: relative; overflow: hidden; }
        .chart-fill { background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; color: white; font-weight: bold; font-size: 0.9em; }
        .recommendation { padding: 15px; background: #e3f2fd; border-left: 4px solid #667eea; border-radius: 4px; margin-bottom: 15px; }
        .recommendation strong { color: #667eea; }
        footer { text-align: center; color: #999; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
        .warning { background: #fff3cd; border-left-color: #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📊 Reporte de Tareas Pendientes</h1>
            <p>Autorenta - ${new Date().toLocaleDateString("es-ES")}</p>
            <p style="margin-top: 10px; font-size: 0.9em; opacity: 0.9;">Rama: ${gitStatus.branches[0] || "desconocida"}</p>
        </header>

        <div class="summary">
            <div class="stat-card">
                <h3>Progreso General</h3>
                <div class="value">${report.percentageComplete}<span class="unit">%</span></div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.percentageComplete}%"></div>
                </div>
            </div>
            <div class="stat-card">
                <h3>Tareas Completadas</h3>
                <div class="value">${report.completedTasks}<span class="unit">/${report.totalTasks}</span></div>
            </div>
            <div class="stat-card">
                <h3>Tiempo Estimado</h3>
                <div class="value">${Math.round(report.estimatedTimeToCompletion / 8)}<span class="unit">días</span></div>
                <p style="font-size: 0.85em; color: #999; margin-top: 5px;">${report.estimatedTimeToCompletion} horas</p>
            </div>
            <div class="stat-card">
                <h3>Bloqueadores Críticos</h3>
                <div class="value" style="color: #ff6b6b;">${report.criticalBlockers.length}</div>
            </div>
        </div>

        <div class="section">
            <h2>📋 Distribución por Prioridad</h2>
            <div class="chart">
                <div class="chart-bar">
                    <div class="chart-label">🔴 Críticas (P0)</div>
                    <div class="chart-value">
                        <div class="chart-fill" style="width: ${(report.tasksByPriority.P0 / report.totalTasks) * 100}%">${report.tasksByPriority.P0}</div>
                    </div>
                </div>
                <div class="chart-bar">
                    <div class="chart-label">🟠 Alta (P1)</div>
                    <div class="chart-value">
                        <div class="chart-fill" style="width: ${(report.tasksByPriority.P1 / report.totalTasks) * 100}%">${report.tasksByPriority.P1}</div>
                    </div>
                </div>
                <div class="chart-bar">
                    <div class="chart-label">🔵 Media (P2)</div>
                    <div class="chart-value">
                        <div class="chart-fill" style="width: ${(report.tasksByPriority.P2 / report.totalTasks) * 100}%">${report.tasksByPriority.P2}</div>
                    </div>
                </div>
                <div class="chart-bar">
                    <div class="chart-label">🟢 Baja (P3)</div>
                    <div class="chart-value">
                        <div class="chart-fill" style="width: ${(report.tasksByPriority.P3 / report.totalTasks) * 100}%">${report.tasksByPriority.P3}</div>
                    </div>
                </div>
            </div>
        </div>

        ${
          report.criticalBlockers.length > 0
            ? `
        <div class="section warning">
            <h2>⚠️ Bloqueadores Críticos</h2>
            <ul class="task-list">
                ${report.criticalBlockers
                  .map(
                    (task) => `
                <li class="task-item p0">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <span class="task-priority priority-p0">${task.priority}</span>
                            <span class="task-status">${task.status}</span>
                            <div style="margin-top: 8px; font-weight: bold;">${task.title}</div>
                            <div class="task-file">${task.file}:${task.line}</div>
                        </div>
                        <div style="text-align: right; font-size: 0.85em; color: #999;">
                            <div>${task.estimatedHours} horas</div>
                            <div>${task.category}</div>
                        </div>
                    </div>
                </li>
                `
                  )
                  .join("")}
            </ul>
        </div>
        `
            : ""
        }

        <div class="section">
            <h2>🎯 Próximos Pasos Recomendados</h2>
            <ul class="task-list">
                ${report.nextSteps
                  .slice(0, 5)
                  .map(
                    (task) => `
                <li class="task-item ${task.priority.toLowerCase()}">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <span class="task-priority priority-${task.priority.toLowerCase()}">${task.priority}</span>
                            <span class="task-status">${task.status}</span>
                            <div style="margin-top: 8px; font-weight: bold;">${task.title}</div>
                            <div class="task-file">${task.file}:${task.line}</div>
                        </div>
                        <div style="text-align: right; font-size: 0.85em; color: #999;">
                            <div>${task.estimatedHours} horas</div>
                        </div>
                    </div>
                </li>
                `
                  )
                  .join("")}
            </ul>
        </div>

        <div class="section">
            <h2>💡 Recomendaciones</h2>
            ${report.recommendations
              .map(
                (rec) => `
            <div class="recommendation">
                ${rec}
            </div>
            `
              )
              .join("")}
        </div>

        <footer>
            <p>Generado automáticamente por Task Completion MCP</p>
            <p style="margin-top: 10px; font-size: 0.8em;">Cambios sin guardar: ${gitStatus.uncommitted} | Archivos sin rastrear: ${gitStatus.untracked}</p>
        </footer>
    </div>
</body>
</html>
    `;

    fs.writeFileSync(outputPath, html);
    console.log(`✅ Reporte generado en: ${outputPath}`);
  }

  /**
   * Main execution
   */
  async run(): Promise<void> {
    console.log("🔍 Escaneando proyecto para tareas pendientes...\n");

    await this.scanForTasks();
    console.log(`✅ ${this.tasks.length} tareas encontradas\n`);

    const report = await this.generateReport();

    console.log("📊 RESUMEN DEL PROYECTO");
    console.log("═══════════════════════════════════════════════════\n");
    console.log(`Progreso General: ${report.percentageComplete}%`);
    console.log(`Tareas Completadas: ${report.completedTasks}/${report.totalTasks}`);
    console.log(
      `Tiempo Estimado: ${Math.round(report.estimatedTimeToCompletion / 8)} días (${report.estimatedTimeToCompletion} horas)\n`
    );

    console.log("📋 TAREAS POR PRIORIDAD");
    console.log("─────────────────────────");
    console.log(`  🔴 Críticas (P0): ${report.tasksByPriority.P0}`);
    console.log(`  🟠 Alta (P1): ${report.tasksByPriority.P1}`);
    console.log(`  🔵 Media (P2): ${report.tasksByPriority.P2}`);
    console.log(`  🟢 Baja (P3): ${report.tasksByPriority.P3}\n`);

    if (report.criticalBlockers.length > 0) {
      console.log("⚠️  BLOQUEADORES CRÍTICOS");
      console.log("─────────────────────────");
      for (const task of report.criticalBlockers.slice(0, 3)) {
        console.log(`  • ${task.title}`);
        console.log(`    📁 ${task.file}:${task.line}`);
        console.log(`    ⏱️  ${task.estimatedHours} horas\n`);
      }
    }

    console.log("🎯 PRÓXIMOS PASOS");
    console.log("─────────────────────────");
    for (let i = 0; i < Math.min(5, report.nextSteps.length); i++) {
      console.log(`  ${i + 1}. ${report.nextSteps[i].title}`);
    }

    // Generate HTML report
    const reportPath = path.join(this.projectRoot, "task-completion-report.html");
    await this.generateHTMLReport(reportPath);

    console.log(`\n✅ Reporte completo disponible en: ${reportPath}`);
  }
}

// Main execution
const projectRoot = process.argv[2] || process.cwd();
const mcp = new TaskCompletionMCP(projectRoot);
mcp.run().catch(console.error);
