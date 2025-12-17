import { ComponentFixture, TestBed } from '@angular/core/testing';
import { app.config } from './app.config';

describe('app.config', () => {
  let component: app.config;
  let fixture: ComponentFixture<app.config>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [app.config],
    }).compileComponents();

    fixture = TestBed.createComponent(app.config);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
