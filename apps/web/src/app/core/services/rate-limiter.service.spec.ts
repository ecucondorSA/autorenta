import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
  let component: RateLimiterService;
  let fixture: ComponentFixture<RateLimiterService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RateLimiterService],
    }).compileComponents();

    fixture = TestBed.createComponent(RateLimiterService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
