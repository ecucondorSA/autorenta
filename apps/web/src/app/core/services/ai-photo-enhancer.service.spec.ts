import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiPhotoEnhancerService } from './ai-photo-enhancer.service';

describe('AiPhotoEnhancerService', () => {
  let component: AiPhotoEnhancerService;
  let fixture: ComponentFixture<AiPhotoEnhancerService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiPhotoEnhancerService],
    }).compileComponents();

    fixture = TestBed.createComponent(AiPhotoEnhancerService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
