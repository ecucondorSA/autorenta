import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdentityLevelService } from './identity-level.service';

describe('IdentityLevelService', () => {
  let component: IdentityLevelService;
  let fixture: ComponentFixture<IdentityLevelService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdentityLevelService],
    }).compileComponents();

    fixture = TestBed.createComponent(IdentityLevelService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
