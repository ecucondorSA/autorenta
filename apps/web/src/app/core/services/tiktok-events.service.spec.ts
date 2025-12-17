import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TikTokEventsService } from './tiktok-events.service';

describe('TikTokEventsService', () => {
  let component: TikTokEventsService;
  let fixture: ComponentFixture<TikTokEventsService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TikTokEventsService],
    }).compileComponents();

    fixture = TestBed.createComponent(TikTokEventsService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
