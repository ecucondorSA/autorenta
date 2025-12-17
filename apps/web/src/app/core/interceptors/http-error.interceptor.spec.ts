import { ComponentFixture, TestBed } from '@angular/core/testing';
import { http-error.interceptor } from './http-error.interceptor';

describe('http-error.interceptor', () => {
  let component: http-error.interceptor;
  let fixture: ComponentFixture<http-error.interceptor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [http-error.interceptor],
    }).compileComponents();

    fixture = TestBed.createComponent(http-error.interceptor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
