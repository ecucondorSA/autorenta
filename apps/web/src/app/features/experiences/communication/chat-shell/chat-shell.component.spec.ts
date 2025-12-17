import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatShellComponent } from './chat-shell.component';

describe('ChatShellComponent', () => {
  let component: ChatShellComponent;
  let fixture: ComponentFixture<ChatShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatShellComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
