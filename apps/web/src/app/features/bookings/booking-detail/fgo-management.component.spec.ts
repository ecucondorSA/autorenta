import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FgoManagementComponent } from './fgo-management.component';

describe('FgoManagementComponent', () => {
  let component: FgoManagementComponent;
  let fixture: ComponentFixture<FgoManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FgoManagementComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FgoManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
