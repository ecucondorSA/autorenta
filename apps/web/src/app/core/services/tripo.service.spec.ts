import { TestBed } from '@angular/core/testing';
import { TripoService } from './tripo.service';

describe('TripoService', () => {
  let service: TripoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TripoService]
    });
    service = TestBed.inject(TripoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have createTask method', () => {
    expect(typeof service.createTask).toBe('function');
  });

  it('should have pollTaskStatus method', () => {
    expect(typeof service.pollTaskStatus).toBe('function');
  });

  it('should have applyTextureFromPrompt method', () => {
    expect(typeof service.applyTextureFromPrompt).toBe('function');
  });

  it('should have texturizeModel method', () => {
    expect(typeof service.texturizeModel).toBe('function');
  });

});
