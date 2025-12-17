import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeoSchemaService } from './seo-schema.service';

describe('SeoSchemaService', () => {
  let component: SeoSchemaService;
  let fixture: ComponentFixture<SeoSchemaService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeoSchemaService],
    }).compileComponents();

    fixture = TestBed.createComponent(SeoSchemaService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
