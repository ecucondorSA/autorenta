import { ComponentFixture, TestBed } from '@angular/core/testing';
import { spatial-index.worker } from './spatial-index.worker';

describe('spatial-index.worker', () => {
  let component: spatial-index.worker;
  let fixture: ComponentFixture<spatial-index.worker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [spatial-index.worker],
    }).compileComponents();

    fixture = TestBed.createComponent(spatial-index.worker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
