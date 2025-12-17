import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarsConversionPage } from './cars-conversion.page';

describe('CarsConversionPage', () => {
  let component: CarsConversionPage;
  let fixture: ComponentFixture<CarsConversionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarsConversionPage],
    }).compileComponents();

    fixture = TestBed.createComponent(CarsConversionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
