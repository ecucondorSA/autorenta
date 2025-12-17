import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManualJournalEntryPage } from './manual-journal-entry.page';

describe('ManualJournalEntryPage', () => {
  let component: ManualJournalEntryPage;
  let fixture: ComponentFixture<ManualJournalEntryPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManualJournalEntryPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ManualJournalEntryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
