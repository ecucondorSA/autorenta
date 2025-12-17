import { ComponentFixture, TestBed } from '@angular/core/testing';
import { app.config.server } from './app.config.server';

describe('app.config.server', () => {
  let component: app.config.server;
  let fixture: ComponentFixture<app.config.server>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [app.config.server],
    }).compileComponents();

    fixture = TestBed.createComponent(app.config.server);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
