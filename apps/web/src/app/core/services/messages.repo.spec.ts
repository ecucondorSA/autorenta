import { ComponentFixture, TestBed } from '@angular/core/testing';
import { messages.repo } from './messages.repo';

describe('messages.repo', () => {
  let component: messages.repo;
  let fixture: ComponentFixture<messages.repo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [messages.repo],
    }).compileComponents();

    fixture = TestBed.createComponent(messages.repo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
