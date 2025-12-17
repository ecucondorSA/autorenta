import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssetPreloaderService } from './asset-preloader.service';

describe('AssetPreloaderService', () => {
  let component: AssetPreloaderService;
  let fixture: ComponentFixture<AssetPreloaderService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetPreloaderService],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetPreloaderService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
