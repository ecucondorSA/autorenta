import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let component: MessagesService;
  let fixture: ComponentFixture<MessagesService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessagesService],
    }).compileComponents();

    fixture = TestBed.createComponent(MessagesService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
