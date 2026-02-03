import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoutReport } from './scout-report';

describe('ScoutReport', () => {
  let component: ScoutReport;
  let fixture: ComponentFixture<ScoutReport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoutReport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScoutReport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
