import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let component: ToastService;
  let fixture: ComponentFixture<ToastService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastService],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
