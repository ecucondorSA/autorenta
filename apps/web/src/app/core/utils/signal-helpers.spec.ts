import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal-helpers } from './signal-helpers';

describe('signal-helpers', () => {
  let component: signal-helpers;
  let fixture: ComponentFixture<signal-helpers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [signal-helpers],
    }).compileComponents();

    fixture = TestBed.createComponent(signal-helpers);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
