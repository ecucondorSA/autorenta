import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WaitlistService } from './waitlist.service';

describe('WaitlistService', () => {
  let component: WaitlistService;
  let fixture: ComponentFixture<WaitlistService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaitlistService],
    }).compileComponents();

    fixture = TestBed.createComponent(WaitlistService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
