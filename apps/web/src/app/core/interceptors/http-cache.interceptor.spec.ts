import { ComponentFixture, TestBed } from '@angular/core/testing';
import { http-cache.interceptor } from './http-cache.interceptor';

describe('http-cache.interceptor', () => {
  let component: http-cache.interceptor;
  let fixture: ComponentFixture<http-cache.interceptor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [http-cache.interceptor],
    }).compileComponents();

    fixture = TestBed.createComponent(http-cache.interceptor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
