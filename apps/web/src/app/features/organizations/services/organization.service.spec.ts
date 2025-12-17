import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrganizationService } from './organization.service';

describe('OrganizationService', () => {
  let component: OrganizationService;
  let fixture: ComponentFixture<OrganizationService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrganizationService],
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
