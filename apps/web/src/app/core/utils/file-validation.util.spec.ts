import { ComponentFixture, TestBed } from '@angular/core/testing';
import { file-validation.util } from './file-validation.util';

describe('file-validation.util', () => {
  let component: file-validation.util;
  let fixture: ComponentFixture<file-validation.util>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [file-validation.util],
    }).compileComponents();

    fixture = TestBed.createComponent(file-validation.util);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
