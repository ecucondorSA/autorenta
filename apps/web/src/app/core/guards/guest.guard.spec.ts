import { ComponentFixture, TestBed } from '@angular/core/testing';
import { guest.guard } from './guest.guard';

describe('guest.guard', () => {
  let component: guest.guard;
  let fixture: ComponentFixture<guest.guard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [guest.guard],
    }).compileComponents();

    fixture = TestBed.createComponent(guest.guard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
