import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnreadMessagesService } from './unread-messages.service';

describe('UnreadMessagesService', () => {
  let component: UnreadMessagesService;
  let fixture: ComponentFixture<UnreadMessagesService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnreadMessagesService],
    }).compileComponents();

    fixture = TestBed.createComponent(UnreadMessagesService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
