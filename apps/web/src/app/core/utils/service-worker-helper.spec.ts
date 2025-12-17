import { ComponentFixture, TestBed } from '@angular/core/testing';
import { service-worker-helper } from './service-worker-helper';

describe('service-worker-helper', () => {
  let component: service-worker-helper;
  let fixture: ComponentFixture<service-worker-helper>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [service-worker-helper],
    }).compileComponents();

    fixture = TestBed.createComponent(service-worker-helper);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
