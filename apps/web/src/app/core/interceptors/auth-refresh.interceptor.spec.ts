import { ComponentFixture, TestBed } from '@angular/core/testing';
import { auth-refresh.interceptor } from './auth-refresh.interceptor';

describe('auth-refresh.interceptor', () => {
  let component: auth-refresh.interceptor;
  let fixture: ComponentFixture<auth-refresh.interceptor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [auth-refresh.interceptor],
    }).compileComponents();

    fixture = TestBed.createComponent(auth-refresh.interceptor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
