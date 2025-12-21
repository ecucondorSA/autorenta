import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have success method', () => {
    expect(typeof service.success).toBe('function');
  });

  it('should have error method', () => {
    expect(typeof service.error).toBe('function');
  });

  it('should have warning method', () => {
    expect(typeof service.warning).toBe('function');
  });

  it('should have info method', () => {
    expect(typeof service.info).toBe('function');
  });

  it('should have show method', () => {
    expect(typeof service.show).toBe('function');
  });

  it('should have remove method', () => {
    expect(typeof service.remove).toBe('function');
  });

  it('should have clear method', () => {
    expect(typeof service.clear).toBe('function');
  });

});
