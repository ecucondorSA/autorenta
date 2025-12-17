import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  let component: AdminService;
  let fixture: ComponentFixture<AdminService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminService],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
