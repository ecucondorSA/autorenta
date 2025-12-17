import { ComponentFixture, TestBed } from '@angular/core/testing';
import { admin.guard } from './admin.guard';

describe('admin.guard', () => {
  let component: admin.guard;
  let fixture: ComponentFixture<admin.guard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [admin.guard],
    }).compileComponents();

    fixture = TestBed.createComponent(admin.guard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
