import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InspectionUploaderComponent } from './inspection-uploader.component';

describe('InspectionUploaderComponent', () => {
  let component: InspectionUploaderComponent;
  let fixture: ComponentFixture<InspectionUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InspectionUploaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InspectionUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
