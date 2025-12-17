import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuaranteeCopyBuilderService } from './guarantee-copy-builder.service';

describe('GuaranteeCopyBuilderService', () => {
  let component: GuaranteeCopyBuilderService;
  let fixture: ComponentFixture<GuaranteeCopyBuilderService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuaranteeCopyBuilderService],
    }).compileComponents();

    fixture = TestBed.createComponent(GuaranteeCopyBuilderService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
