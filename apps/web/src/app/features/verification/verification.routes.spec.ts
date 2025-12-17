import { ComponentFixture, TestBed } from '@angular/core/testing';
import { verification.routes } from './verification.routes';

describe('verification.routes', () => {
  let component: verification.routes;
  let fixture: ComponentFixture<verification.routes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [verification.routes],
    }).compileComponents();

    fixture = TestBed.createComponent(verification.routes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
