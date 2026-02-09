import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoutReportPage } from './scout-report';

describe('ScoutReportPage', () => {
  let component: ScoutReportPage;
  let fixture: ComponentFixture<ScoutReportPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoutReportPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoutReportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
