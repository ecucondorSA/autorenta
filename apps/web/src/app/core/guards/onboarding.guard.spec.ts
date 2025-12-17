import { ComponentFixture, TestBed } from '@angular/core/testing';
import { onboarding.guard } from './onboarding.guard';

describe('onboarding.guard', () => {
  let component: onboarding.guard;
  let fixture: ComponentFixture<onboarding.guard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [onboarding.guard],
    }).compileComponents();

    fixture = TestBed.createComponent(onboarding.guard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
