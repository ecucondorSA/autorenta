import { ComponentFixture, TestBed } from '@angular/core/testing';
import { auth.routes } from './auth.routes';

describe('auth.routes', () => {
  let component: auth.routes;
  let fixture: ComponentFixture<auth.routes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [auth.routes],
    }).compileComponents();

    fixture = TestBed.createComponent(auth.routes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
