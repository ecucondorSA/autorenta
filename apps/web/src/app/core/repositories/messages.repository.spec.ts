import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessagesRepository } from './messages.repository';

describe('MessagesRepository', () => {
  let component: MessagesRepository;
  let fixture: ComponentFixture<MessagesRepository>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessagesRepository],
    }).compileComponents();

    fixture = TestBed.createComponent(MessagesRepository);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
