import { ComponentFixture, TestBed } from '@angular/core/testing';
import { admin.types } from './admin.types';

describe('admin.types', () => {
  let component: admin.types;
  let fixture: ComponentFixture<admin.types>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [admin.types],
    }).compileComponents();

    fixture = TestBed.createComponent(admin.types);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
