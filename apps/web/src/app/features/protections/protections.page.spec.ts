import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProtectionsPage } from './protections.page';

describe('ProtectionsPage', () => {
  let component: ProtectionsPage;
  let fixture: ComponentFixture<ProtectionsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectionsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProtectionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
