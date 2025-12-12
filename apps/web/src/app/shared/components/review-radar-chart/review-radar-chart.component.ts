import {Component, Input, OnChanges, SimpleChanges,
  ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RadarChartData {
  cleanliness: number;
  communication: number;
  accuracy: number;
  location: number;
  checkin: number;
  value: number;
}

interface Point {
  x: number;
  y: number;
}

@Component({
  selector: 'app-review-radar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './review-radar-chart.component.html',
  styleUrls: ['./review-radar-chart.component.css'],
})
export class ReviewRadarChartComponent implements OnChanges {
  @Input() data!: RadarChartData;
  @Input() size: number = 300;
  @Input() showLabels: boolean = true;
  @Input() showGrid: boolean = true;

  // Chart configuration
  readonly centerX: number = 150;
  readonly centerY: number = 150;
  readonly maxRadius: number = 100;
  readonly levels: number = 5;

  // Calculated values
  dataPoints: Point[] = [];
  dataPath: string = '';
  labelPositions: Array<{ x: number; y: number; label: string; value: number }> = [];
  gridLevels: string[] = [];
  axisLines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

  private readonly categories = [
    { key: 'cleanliness', label: 'Limpieza' },
    { key: 'communication', label: 'Comunicación' },
    { key: 'accuracy', label: 'Precisión' },
    { key: 'location', label: 'Ubicación' },
    { key: 'checkin', label: 'Check-in' },
    { key: 'value', label: 'Valor' },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['size']) {
      this.calculateChart();
    }
  }

  private calculateChart(): void {
    if (!this.data) return;

    const values = [
      this.data.cleanliness,
      this.data.communication,
      this.data.accuracy,
      this.data.location,
      this.data.checkin,
      this.data.value,
    ];

    // Calculate data points
    this.dataPoints = this.calculatePoints(values);
    this.dataPath = this.generatePath(this.dataPoints);

    // Calculate label positions
    this.labelPositions = this.categories.map((category, index) => {
      const angle = this.getAngle(index);
      const labelRadius = this.maxRadius + 30;
      const x = this.centerX + labelRadius * Math.cos(angle);
      const y = this.centerY + labelRadius * Math.sin(angle);
      const value = values[index];

      return { x, y, label: category.label, value };
    });

    // Calculate grid levels
    this.gridLevels = Array.from({ length: this.levels }, (_, level) => {
      const radius = (this.maxRadius / this.levels) * (level + 1);
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = this.getAngle(i);
        return {
          x: this.centerX + radius * Math.cos(angle),
          y: this.centerY + radius * Math.sin(angle),
        };
      });
      return this.generatePath(points);
    });

    // Calculate axis lines
    this.axisLines = this.categories.map((_, index) => {
      const angle = this.getAngle(index);
      return {
        x1: this.centerX,
        y1: this.centerY,
        x2: this.centerX + this.maxRadius * Math.cos(angle),
        y2: this.centerY + this.maxRadius * Math.sin(angle),
      };
    });
  }

  private calculatePoints(values: number[]): Point[] {
    return values.map((value, index) => {
      const angle = this.getAngle(index);
      const radius = (value / 5) * this.maxRadius;
      return {
        x: this.centerX + radius * Math.cos(angle),
        y: this.centerY + radius * Math.sin(angle),
      };
    });
  }

  private getAngle(index: number): number {
    // Start from top (-90 degrees) and go clockwise
    return (Math.PI * 2 * index) / 6 - Math.PI / 2;
  }

  private generatePath(points: Point[]): string {
    if (points.length === 0) return '';

    const path = points
      .map((point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return `${command} ${point.x},${point.y}`;
      })
      .join(' ');

    return `${path} Z`;
  }

  getViewBox(): string {
    return `0 0 ${this.size} ${this.size}`;
  }

  getTextAnchor(index: number): string {
    const angle = this.getAngle(index);
    const x = Math.cos(angle);

    if (Math.abs(x) < 0.1) return 'middle';
    return x > 0 ? 'start' : 'end';
  }

  getTextDy(index: number): string {
    const angle = this.getAngle(index);
    const y = Math.sin(angle);

    if (y < -0.5) return '-0.5em'; // Top
    if (y > 0.5) return '1em'; // Bottom
    return '0.35em'; // Middle
  }
}
