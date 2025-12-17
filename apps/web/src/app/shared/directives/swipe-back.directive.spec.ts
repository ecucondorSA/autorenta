import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SwipeBackDirective } from './swipe-back.directive';

describe('SwipeBackDirective', () => {
  let component: SwipeBackDirective;
  let fixture: ComponentFixture<SwipeBackDirective>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SwipeBackDirective],
    }).compileComponents();

    fixture = TestBed.createComponent(SwipeBackDirective);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
