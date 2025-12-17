import { ComponentFixture, TestBed } from '@angular/core/testing';
import { organization.model } from './organization.model';

describe('organization.model', () => {
  let component: organization.model;
  let fixture: ComponentFixture<organization.model>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [organization.model],
    }).compileComponents();

    fixture = TestBed.createComponent(organization.model);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
