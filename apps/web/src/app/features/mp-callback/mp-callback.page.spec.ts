import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MpCallbackPage } from './mp-callback.page';

describe('MpCallbackPage', () => {
  let component: MpCallbackPage;
  let fixture: ComponentFixture<MpCallbackPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MpCallbackPage],
    }).compileComponents();

    fixture = TestBed.createComponent(MpCallbackPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
