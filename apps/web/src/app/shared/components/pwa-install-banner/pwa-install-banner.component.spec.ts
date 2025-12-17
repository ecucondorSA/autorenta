import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PwaInstallBannerComponent } from './pwa-install-banner.component';

describe('PwaInstallBannerComponent', () => {
  let component: PwaInstallBannerComponent;
  let fixture: ComponentFixture<PwaInstallBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PwaInstallBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PwaInstallBannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
