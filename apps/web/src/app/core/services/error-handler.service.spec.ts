import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorHandlerService } from './error-handler.service';

describe('ErrorHandlerService', () => {
  let component: ErrorHandlerService;
  let fixture: ComponentFixture<ErrorHandlerService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorHandlerService],
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorHandlerService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
