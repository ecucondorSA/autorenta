import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GoogleAiPhotoGeneratorComponent } from './google-ai-photo-generator.component';

describe('GoogleAiPhotoGeneratorComponent', () => {
  let component: GoogleAiPhotoGeneratorComponent;
  let fixture: ComponentFixture<GoogleAiPhotoGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoogleAiPhotoGeneratorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GoogleAiPhotoGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
