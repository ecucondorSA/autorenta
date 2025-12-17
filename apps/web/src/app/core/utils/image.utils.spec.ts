import { ComponentFixture, TestBed } from '@angular/core/testing';
import { image.utils } from './image.utils';

describe('image.utils', () => {
  let component: image.utils;
  let fixture: ComponentFixture<image.utils>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [image.utils],
    }).compileComponents();

    fixture = TestBed.createComponent(image.utils);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
