import { ComponentFixture, TestBed } from '@angular/core/testing';
import { car-placeholder-images } from './car-placeholder-images';

describe('car-placeholder-images', () => {
  let component: car-placeholder-images;
  let fixture: ComponentFixture<car-placeholder-images>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [car-placeholder-images],
    }).compileComponents();

    fixture = TestBed.createComponent(car-placeholder-images);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
