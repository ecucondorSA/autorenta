import { ComponentFixture, TestBed } from '@angular/core/testing';
import { app.routes } from './app.routes';

describe('app.routes', () => {
  let component: app.routes;
  let fixture: ComponentFixture<app.routes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [app.routes],
    }).compileComponents();

    fixture = TestBed.createComponent(app.routes);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
