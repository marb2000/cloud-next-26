import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Curriculum } from './curriculum';

describe('Curriculum', () => {
  let component: Curriculum;
  let fixture: ComponentFixture<Curriculum>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Curriculum]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Curriculum);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
