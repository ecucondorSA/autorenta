import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

export interface TrustCategory {
  icon: string;
  label: string;
  score: number;
  maxScore?: number;
}

export interface VerificationStep {
  id: string;
  label: string;
  completed: boolean;
  icon: string;
}

@Component({
  selector: 'app-trust-score',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="trust-score-card" [@cardEnter]>
      <div class="card-header">
        <h3 class="card-title">Puntuación de Confianza</h3>
        <span class="overall-score">
          {{ averageScore.toFixed(1) }}
          <span class="score-max">/5</span>
        </span>
      </div>
      
      <div class="categories-list">
        <div 
          *ngFor="let category of categories; let i = index" 
          class="category-item"
          [@categoryEnter]="i"
        >
          <div class="category-header">
            <span class="category-label">{{ category.icon }} {{ category.label }}</span>
            <span class="category-score">{{ category.score }}/{{ category.maxScore || 5 }}</span>
          </div>
          <div class="progress-bar-container">
            <div 
              class="progress-bar-fill"
              [style.width.%]="(category.score / (category.maxScore || 5)) * 100"
              [@progressBar]
            ></div>
          </div>
        </div>
      </div>
      
      <div class="verification-section" *ngIf="verificationSteps.length > 0">
        <h4 class="verification-title">Verificaciones</h4>
        <div class="verification-list">
          <div 
            *ngFor="let step of verificationSteps; let i = index"
            class="verification-item"
            [class.completed]="step.completed"
            [@verificationEnter]="i"
          >
            <span class="verification-icon">{{ step.completed ? '✓' : step.icon }}</span>
            <span class="verification-label">{{ step.label }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .trust-score-card {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #171717;
      margin: 0;
    }
    .overall-score {
      font-size: 1.5rem;
      font-weight: 700;
      color: #3ba870;
    }
    .score-max {
      font-size: 1rem;
      font-weight: 400;
      color: #737373;
    }
    .categories-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .category-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .category-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }
    .category-label { color: #404040; }
    .category-score { color: #737373; font-weight: 500; }
    .progress-bar-container {
      height: 0.5rem;
      background: #e5e5e5;
      border-radius: 9999px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #16a34a);
      border-radius: 9999px;
      transition: width 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .verification-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e5e5;
    }
    .verification-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #404040;
      margin: 0 0 1rem 0;
    }
    .verification-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .verification-item {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.375rem 0.75rem;
      background: #f5f5f5;
      border-radius: 9999px;
      font-size: 0.75rem;
      color: #525252;
    }
    .verification-item.completed {
      background: #dcfce7;
      color: #166534;
    }
    .verification-icon { font-size: 0.75rem; }
  `],
  animations: [
    trigger('cardEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('categoryEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('progressBar', [
      transition(':enter', [
        style({ width: '0%' }),
        animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)')
      ])
    ]),
    trigger('verificationEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class TrustScoreComponent implements OnInit {
  @Input() categories: TrustCategory[] = [];
  @Input() verificationSteps: VerificationStep[] = [];
  
  averageScore = 0;

  ngOnInit(): void {
    this.calculateAverage();
  }

  private calculateAverage(): void {
    if (this.categories.length === 0) return;
    const sum = this.categories.reduce((acc, cat) => acc + cat.score, 0);
    this.averageScore = sum / this.categories.length;
  }
}
