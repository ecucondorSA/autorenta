import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatabaseExportPage } from './database-export.page';

describe('DatabaseExportPage', () => {
  let component: DatabaseExportPage;
  let fixture: ComponentFixture<DatabaseExportPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatabaseExportPage],
    }).compileComponents();

    fixture = TestBed.createComponent(DatabaseExportPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
