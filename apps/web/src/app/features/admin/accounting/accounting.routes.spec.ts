import { ComponentFixture, TestBed } from '@angular/core/testing';
import { accounting.routes } from './accounting.routes';

describe('accounting.routes', () => {
  let component: accounting.routes;
  let fixture: ComponentFixture<accounting.routes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [accounting.routes],
    }).compileComponents();

    fixture = TestBed.createComponent(accounting.routes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
