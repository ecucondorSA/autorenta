import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModerateReviewsPage } from './moderate-reviews.page';

describe('ModerateReviewsPage', () => {
  let component: ModerateReviewsPage;
  let fixture: ComponentFixture<ModerateReviewsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModerateReviewsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ModerateReviewsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
