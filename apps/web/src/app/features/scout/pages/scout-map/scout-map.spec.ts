import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoutMapPage } from './scout-map';

describe('ScoutMapPage', () => {
  let component: ScoutMapPage;
  let fixture: ComponentFixture<ScoutMapPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoutMapPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScoutMapPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
