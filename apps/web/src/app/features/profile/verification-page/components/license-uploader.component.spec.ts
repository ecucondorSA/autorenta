import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LicenseUploaderComponent } from './license-uploader.component';

describe('LicenseUploaderComponent', () => {
  let component: LicenseUploaderComponent;
  let fixture: ComponentFixture<LicenseUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LicenseUploaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LicenseUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
