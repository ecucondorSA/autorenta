import { ComponentFixture, TestBed } from '@angular/core/testing';
import { chat-message.schemas } from './chat-message.schemas';

describe('chat-message.schemas', () => {
  let component: chat-message.schemas;
  let fixture: ComponentFixture<chat-message.schemas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [chat-message.schemas],
    }).compileComponents();

    fixture = TestBed.createComponent(chat-message.schemas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
