import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Dashboard } from './dashboard';
import { AnalyticsService } from '../../core/services/analytics.service';
import { vi } from 'vitest';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        {
          provide: AnalyticsService,
          useValue: {
            getUserStats: vi.fn().mockResolvedValue({ totalUsers: 0, proUsers: 0, imagesGenerated: 0, tokensConsumed: 0 }),
            getDeckStats: vi.fn().mockResolvedValue({ totalDecks: 0, topDecks: [] })
          }
        }
      ]
    });

    TestBed.overrideComponent(Dashboard, {
      set: {
        templateUrl: undefined,
        styleUrls: undefined,
        template: '<div></div>',
        styles: []
      }
    });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
