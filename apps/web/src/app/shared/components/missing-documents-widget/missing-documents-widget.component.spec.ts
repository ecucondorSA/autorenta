import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MissingDocumentsWidgetComponent } from './missing-documents-widget.component';

describe('MissingDocumentsWidgetComponent', () => {
  let component: MissingDocumentsWidgetComponent;
  let fixture: ComponentFixture<MissingDocumentsWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MissingDocumentsWidgetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MissingDocumentsWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
