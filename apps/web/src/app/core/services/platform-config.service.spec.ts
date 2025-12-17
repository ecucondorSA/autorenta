import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlatformConfigService } from './platform-config.service';

describe('PlatformConfigService', () => {
  let component: PlatformConfigService;
  let fixture: ComponentFixture<PlatformConfigService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlatformConfigService],
    }).compileComponents();

    fixture = TestBed.createComponent(PlatformConfigService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
