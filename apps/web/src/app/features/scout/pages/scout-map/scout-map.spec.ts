import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScoutMap } from './scout-map';

describe('ScoutMap', () => {
  let component: ScoutMap;
  let fixture: ComponentFixture<ScoutMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoutMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScoutMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
