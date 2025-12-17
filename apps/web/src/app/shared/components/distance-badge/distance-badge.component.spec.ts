import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DistanceBadgeComponent } from './distance-badge.component';

describe('DistanceBadgeComponent', () => {
  let component: DistanceBadgeComponent;
  let fixture: ComponentFixture<DistanceBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistanceBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DistanceBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
