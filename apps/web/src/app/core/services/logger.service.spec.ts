import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let component: LoggerService;
  let fixture: ComponentFixture<LoggerService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoggerService],
    }).compileComponents();

    fixture = TestBed.createComponent(LoggerService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
