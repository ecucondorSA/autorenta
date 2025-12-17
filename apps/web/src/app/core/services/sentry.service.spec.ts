import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SentryErrorHandler } from './sentry.service';

describe('SentryErrorHandler', () => {
  let component: SentryErrorHandler;
  let fixture: ComponentFixture<SentryErrorHandler>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SentryErrorHandler],
    }).compileComponents();

    fixture = TestBed.createComponent(SentryErrorHandler);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
