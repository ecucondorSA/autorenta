import { ComponentFixture, TestBed } from '@angular/core/testing';
import { trace-id.interceptor } from './trace-id.interceptor';

describe('trace-id.interceptor', () => {
  let component: trace-id.interceptor;
  let fixture: ComponentFixture<trace-id.interceptor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [trace-id.interceptor],
    }).compileComponents();

    fixture = TestBed.createComponent(trace-id.interceptor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
