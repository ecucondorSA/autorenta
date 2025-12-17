import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OwnerDamageReportPage } from './owner-damage-report.page';

describe('OwnerDamageReportPage', () => {
  let component: OwnerDamageReportPage;
  let fixture: ComponentFixture<OwnerDamageReportPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OwnerDamageReportPage],
    }).compileComponents();

    fixture = TestBed.createComponent(OwnerDamageReportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
