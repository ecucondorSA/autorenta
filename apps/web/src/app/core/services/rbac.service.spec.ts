import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RBACService } from './rbac.service';

describe('RBACService', () => {
  let component: RBACService;
  let fixture: ComponentFixture<RBACService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RBACService],
    }).compileComponents();

    fixture = TestBed.createComponent(RBACService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
