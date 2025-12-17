import { ComponentFixture, TestBed } from '@angular/core/testing';
import { api.utils } from './api.utils';

describe('api.utils', () => {
  let component: api.utils;
  let fixture: ComponentFixture<api.utils>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [api.utils],
    }).compileComponents();

    fixture = TestBed.createComponent(api.utils);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
