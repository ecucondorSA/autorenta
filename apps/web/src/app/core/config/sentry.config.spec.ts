import { ComponentFixture, TestBed } from '@angular/core/testing';
import { sentry.config } from './sentry.config';

describe('sentry.config', () => {
  let component: sentry.config;
  let fixture: ComponentFixture<sentry.config>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [sentry.config],
    }).compileComponents();

    fixture = TestBed.createComponent(sentry.config);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
