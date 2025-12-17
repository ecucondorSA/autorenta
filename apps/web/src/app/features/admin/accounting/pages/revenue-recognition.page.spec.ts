import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RevenueRecognitionPage } from './revenue-recognition.page';

describe('RevenueRecognitionPage', () => {
  let component: RevenueRecognitionPage;
  let fixture: ComponentFixture<RevenueRecognitionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RevenueRecognitionPage],
    }).compileComponents();

    fixture = TestBed.createComponent(RevenueRecognitionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
