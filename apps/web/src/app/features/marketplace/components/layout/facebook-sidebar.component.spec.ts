import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FacebookSidebarComponent } from './facebook-sidebar.component';

describe('FacebookSidebarComponent', () => {
  let component: FacebookSidebarComponent;
  let fixture: ComponentFixture<FacebookSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacebookSidebarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FacebookSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
