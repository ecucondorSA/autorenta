import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarReviewsSectionComponent } from './car-reviews-section.component';

describe('CarReviewsSectionComponent', () => {
  let component: CarReviewsSectionComponent;
  let fixture: ComponentFixture<CarReviewsSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarReviewsSectionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CarReviewsSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
