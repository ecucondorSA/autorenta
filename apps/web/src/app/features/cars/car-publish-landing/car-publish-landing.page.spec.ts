import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarPublishLandingPage } from './car-publish-landing.page';

describe('CarPublishLandingPage', () => {
  let component: CarPublishLandingPage;
  let fixture: ComponentFixture<CarPublishLandingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarPublishLandingPage],
    }).compileComponents();

    fixture = TestBed.createComponent(CarPublishLandingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
