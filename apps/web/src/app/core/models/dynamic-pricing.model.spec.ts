import { ComponentFixture, TestBed } from '@angular/core/testing';
import { dynamic-pricing.model } from './dynamic-pricing.model';

describe('dynamic-pricing.model', () => {
  let component: dynamic-pricing.model;
  let fixture: ComponentFixture<dynamic-pricing.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [dynamic-pricing.model],
    }).compileComponents();

    fixture = TestBed.createComponent(dynamic-pricing.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
