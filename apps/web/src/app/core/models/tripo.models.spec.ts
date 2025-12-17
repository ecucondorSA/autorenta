import { ComponentFixture, TestBed } from '@angular/core/testing';
import { tripo.models } from './tripo.models';

describe('tripo.models', () => {
  let component: tripo.models;
  let fixture: ComponentFixture<tripo.models>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [tripo.models],
    }).compileComponents();

    fixture = TestBed.createComponent(tripo.models);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // TODO: Add more tests
});
