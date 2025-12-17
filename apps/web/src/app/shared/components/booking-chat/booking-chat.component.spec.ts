import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingChatComponent } from './booking-chat.component';

describe('BookingChatComponent', () => {
  let component: BookingChatComponent;
  let fixture: ComponentFixture<BookingChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookingChatComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
