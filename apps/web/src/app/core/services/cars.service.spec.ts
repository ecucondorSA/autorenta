import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarsService } from './cars.service';

describe('CarsService', () => {
  let component: CarsService;
  let fixture: ComponentFixture<CarsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarsService],
    }).compileComponents();

    fixture = TestBed.createComponent(CarsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
