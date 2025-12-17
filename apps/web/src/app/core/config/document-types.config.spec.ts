import { ComponentFixture, TestBed } from '@angular/core/testing';
import { document-types.config } from './document-types.config';

describe('document-types.config', () => {
  let component: document-types.config;
  let fixture: ComponentFixture<document-types.config>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [document-types.config],
    }).compileComponents();

    fixture = TestBed.createComponent(document-types.config);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
