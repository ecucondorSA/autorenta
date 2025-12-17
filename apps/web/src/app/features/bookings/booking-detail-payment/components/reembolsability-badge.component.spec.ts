import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReembolsabilityBadgeComponent } from './reembolsability-badge.component';

describe('ReembolsabilityBadgeComponent', () => {
  let component: ReembolsabilityBadgeComponent;
  let fixture: ComponentFixture<ReembolsabilityBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReembolsabilityBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReembolsabilityBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
