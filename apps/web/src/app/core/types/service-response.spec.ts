import { ComponentFixture, TestBed } from '@angular/core/testing';
import { service-response } from './service-response';

describe('service-response', () => {
  let component: service-response;
  let fixture: ComponentFixture<service-response>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [service-response],
    }).compileComponents();

    fixture = TestBed.createComponent(service-response);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
