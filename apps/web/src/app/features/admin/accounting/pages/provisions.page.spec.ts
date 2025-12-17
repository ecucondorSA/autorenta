import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProvisionsPage } from './provisions.page';

describe('ProvisionsPage', () => {
  let component: ProvisionsPage;
  let fixture: ComponentFixture<ProvisionsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProvisionsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ProvisionsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
