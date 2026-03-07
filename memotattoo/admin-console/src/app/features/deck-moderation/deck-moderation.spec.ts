import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeckModeration } from './deck-moderation';

describe('DeckModeration', () => {
  let component: DeckModeration;
  let fixture: ComponentFixture<DeckModeration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeckModeration]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeckModeration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
