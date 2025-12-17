import { ComponentFixture, TestBed } from '@angular/core/testing';
import { car-placeholder.util } from './car-placeholder.util';

describe('car-placeholder.util', () => {
  let component: car-placeholder.util;
  let fixture: ComponentFixture<car-placeholder.util>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [car-placeholder.util],
    }).compileComponents();

    fixture = TestBed.createComponent(car-placeholder.util);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
