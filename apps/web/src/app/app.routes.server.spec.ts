import { ComponentFixture, TestBed } from '@angular/core/testing';
import { app.routes.server } from './app.routes.server';

describe('app.routes.server', () => {
  let component: app.routes.server;
  let fixture: ComponentFixture<app.routes.server>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [app.routes.server],
    }).compileComponents();

    fixture = TestBed.createComponent(app.routes.server);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
