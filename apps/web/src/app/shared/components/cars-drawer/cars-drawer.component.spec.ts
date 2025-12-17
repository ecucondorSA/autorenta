import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarsDrawerComponent } from './cars-drawer.component';

describe('CarsDrawerComponent', () => {
  let component: CarsDrawerComponent;
  let fixture: ComponentFixture<CarsDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CarsDrawerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CarsDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
