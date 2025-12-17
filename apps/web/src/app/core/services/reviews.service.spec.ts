import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let component: ReviewsService;
  let fixture: ComponentFixture<ReviewsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewsService],
    }).compileComponents();

    fixture = TestBed.createComponent(ReviewsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
