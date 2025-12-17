import { ComponentFixture, TestBed } from '@angular/core/testing';
import { chat-context } from './chat-context';

describe('chat-context', () => {
  let component: chat-context;
  let fixture: ComponentFixture<chat-context>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [chat-context],
    }).compileComponents();

    fixture = TestBed.createComponent(chat-context);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
