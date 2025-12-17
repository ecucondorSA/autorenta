import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyClaimsPage } from './my-claims.page';

describe('MyClaimsPage', () => {
  let component: MyClaimsPage;
  let fixture: ComponentFixture<MyClaimsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyClaimsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(MyClaimsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
