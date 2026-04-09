import { TestBed } from '@angular/core/testing';
import { Auth } from './auth';
import { Router } from '@angular/router';
import { vi } from 'vitest';

describe('Auth', () => {
  let service: Auth;

  beforeEach(() => {
    const mockRouter = { navigate: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: mockRouter }
      ]
    });
    service = TestBed.inject(Auth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
