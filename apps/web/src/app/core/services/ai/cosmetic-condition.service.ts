import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from '@core/services/supabase.service';

/**
 * Cosmetic Condition Analysis Service
 *
 * Uses Gemini Vision to analyze the cosmetic condition of a vehicle.
 * Detects scratches, dents, rust, wear patterns, and generates a condition score.
 */

export type VehicleArea = 'front' | 'rear' | 'left' | 'right' | 'roof' | 'interior' | 'dashboard' | 'seats' | 'trunk';
export type IssueSeverity = 'minor' | 'moderate' | 'severe';
export type IssueType = 'scratch' | 'dent' | 'rust' | 'paint_fade' | 'crack' | 'stain' | 'tear' | 'wear' | 'missing_part';
export type ConditionGrade = 'excellent' | 'good' | 'fair' | 'poor';

export interface CosmeticIssue {
  type: IssueType;
  severity: IssueSeverity;
  location: string;
  size_estimate: string;
  repair_cost_range?: string;
}

export interface ConditionAnalysisResult {
  success: boolean;
  area_analyzed: string;
  condition_score: number;
  condition_grade: ConditionGrade;
  issues: CosmeticIssue[];
  summary: string;
  recommendations: string[];
  estimated_repair_total?: string;
  error?: string;
}

export interface VehicleConditionReport {
  overall_score: number;
  overall_grade: ConditionGrade;
  areas: Record<VehicleArea, ConditionAnalysisResult>;
  total_issues: number;
  critical_issues: CosmeticIssue[];
  estimated_total_repair: string;
}

@Injectable({ providedIn: 'root' })
export class CosmeticConditionService {
  private readonly supabase = inject(SupabaseService);

  // State
  readonly isAnalyzing = signal(false);
  readonly analysisResults = signal<Map<VehicleArea, ConditionAnalysisResult>>(new Map());
  readonly error = signal<string | null>(null);

  // Computed
  readonly overallScore = computed(() => {
    const results = this.analysisResults();
    if (results.size === 0) return 0;

    const scores = Array.from(results.values())
      .filter(r => r.success)
      .map(r => r.condition_score);

    return scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  });

  readonly overallGrade = computed<ConditionGrade>(() => {
    const score = this.overallScore();
    if (score >= 9) return 'excellent';
    if (score >= 7) return 'good';
    if (score >= 5) return 'fair';
    return 'poor';
  });

  readonly allIssues = computed(() => {
    const results = this.analysisResults();
    const issues: Array<CosmeticIssue & { area: VehicleArea }> = [];

    results.forEach((result, area) => {
      result.issues.forEach(issue => {
        issues.push({ ...issue, area });
      });
    });

    return issues;
  });

  readonly criticalIssues = computed(() =>
    this.allIssues().filter(i => i.severity === 'severe')
  );

  /**
   * Analyze a single area of the vehicle
   */
  async analyzeArea(imageUrl: string, area: VehicleArea): Promise<ConditionAnalysisResult> {
    this.isAnalyzing.set(true);
    this.error.set(null);

    const isInterior = ['interior', 'dashboard', 'seats', 'trunk'].includes(area);

    try {
      const { data, error } = await this.supabase.client.functions.invoke<ConditionAnalysisResult>(
        'analyze-cosmetic-condition',
        {
          body: {
            image_url: imageUrl,
            area,
            is_interior: isInterior,
          },
        }
      );

      if (error) throw error;

      const result = data!;

      // Update results map
      this.analysisResults.update(map => {
        const newMap = new Map(map);
        newMap.set(area, result);
        return newMap;
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al analizar condición';
      this.error.set(message);
      throw err;
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  /**
   * Analyze multiple areas in parallel
   */
  async analyzeMultipleAreas(
    areas: Array<{ imageUrl: string; area: VehicleArea }>
  ): Promise<Map<VehicleArea, ConditionAnalysisResult>> {
    this.isAnalyzing.set(true);
    this.error.set(null);

    try {
      const results = await Promise.all(
        areas.map(async ({ imageUrl, area }) => {
          try {
            return await this.analyzeArea(imageUrl, area);
          } catch {
            return {
              success: false,
              area_analyzed: area,
              condition_score: 0,
              condition_grade: 'poor' as ConditionGrade,
              issues: [],
              summary: '',
              recommendations: [],
              error: 'Error al analizar área',
            };
          }
        })
      );

      const resultsMap = new Map<VehicleArea, ConditionAnalysisResult>();
      areas.forEach(({ area }, index) => {
        resultsMap.set(area, results[index]);
      });

      this.analysisResults.set(resultsMap);
      return resultsMap;
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  /**
   * Generate a complete vehicle condition report
   */
  generateReport(): VehicleConditionReport {
    const results = this.analysisResults();
    const areas: Record<string, ConditionAnalysisResult> = {};

    results.forEach((result, area) => {
      areas[area] = result;
    });

    // Calculate total repair estimate
    let minTotal = 0;
    let maxTotal = 0;

    this.allIssues().forEach(issue => {
      if (issue.repair_cost_range) {
        const match = issue.repair_cost_range.match(/\$(\d+)-(\d+)/);
        if (match) {
          minTotal += parseInt(match[1], 10);
          maxTotal += parseInt(match[2], 10);
        }
      }
    });

    return {
      overall_score: this.overallScore(),
      overall_grade: this.overallGrade(),
      areas: areas as Record<VehicleArea, ConditionAnalysisResult>,
      total_issues: this.allIssues().length,
      critical_issues: this.criticalIssues(),
      estimated_total_repair: minTotal > 0 ? `$${minTotal}-${maxTotal}` : '$0',
    };
  }

  /**
   * Get condition badge color based on grade
   */
  getGradeColor(grade: ConditionGrade): string {
    switch (grade) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'primary';
      case 'fair':
        return 'warning';
      case 'poor':
        return 'danger';
    }
  }

  /**
   * Get severity badge color
   */
  getSeverityColor(severity: IssueSeverity): string {
    switch (severity) {
      case 'minor':
        return 'medium';
      case 'moderate':
        return 'warning';
      case 'severe':
        return 'danger';
    }
  }

  /**
   * Reset all analysis results
   */
  reset(): void {
    this.analysisResults.set(new Map());
    this.error.set(null);
  }
}
