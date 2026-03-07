import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameSimulation } from './game-simulation';

describe('GameSimulation', () => {
  let component: GameSimulation;
  let fixture: ComponentFixture<GameSimulation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameSimulation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameSimulation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
