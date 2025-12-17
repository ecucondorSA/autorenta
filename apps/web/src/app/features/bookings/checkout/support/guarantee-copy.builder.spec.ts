import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuaranteeCopyBuilder } from './guarantee-copy.builder';

describe('GuaranteeCopyBuilder', () => {
  let component: GuaranteeCopyBuilder;
  let fixture: ComponentFixture<GuaranteeCopyBuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuaranteeCopyBuilder],
    }).compileComponents();

    fixture = TestBed.createComponent(GuaranteeCopyBuilder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
