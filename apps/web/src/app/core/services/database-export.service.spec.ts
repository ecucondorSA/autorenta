import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DatabaseExportService } from './database-export.service';

describe('DatabaseExportService', () => {
  let component: DatabaseExportService;
  let fixture: ComponentFixture<DatabaseExportService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatabaseExportService],
    }).compileComponents();

    fixture = TestBed.createComponent(DatabaseExportService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
