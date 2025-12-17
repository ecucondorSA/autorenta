import { ComponentFixture, TestBed } from '@angular/core/testing';
import { timing.constants } from './timing.constants';

describe('timing.constants', () => {
  let component: timing.constants;
  let fixture: ComponentFixture<timing.constants>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [timing.constants],
    }).compileComponents();

    fixture = TestBed.createComponent(timing.constants);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
