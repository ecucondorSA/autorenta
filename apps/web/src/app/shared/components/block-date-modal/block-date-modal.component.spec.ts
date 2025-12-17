import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BlockDateModalComponent } from './block-date-modal.component';

describe('BlockDateModalComponent', () => {
  let component: BlockDateModalComponent;
  let fixture: ComponentFixture<BlockDateModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BlockDateModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BlockDateModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
