import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TermsAndConsentsComponent } from './terms-and-consents.component';

describe('TermsAndConsentsComponent', () => {
  let component: TermsAndConsentsComponent;
  let fixture: ComponentFixture<TermsAndConsentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsAndConsentsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TermsAndConsentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
