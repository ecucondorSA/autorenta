import { ComponentFixture, TestBed } from '@angular/core/testing';
import { auth.guard } from './auth.guard';

describe('auth.guard', () => {
  let component: auth.guard;
  let fixture: ComponentFixture<auth.guard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [auth.guard],
    }).compileComponents();

    fixture = TestBed.createComponent(auth.guard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
