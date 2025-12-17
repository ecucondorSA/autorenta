import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PwaInstallService } from './pwa-install.service';

describe('PwaInstallService', () => {
  let component: PwaInstallService;
  let fixture: ComponentFixture<PwaInstallService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwaInstallService],
    }).compileComponents();

    fixture = TestBed.createComponent(PwaInstallService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
