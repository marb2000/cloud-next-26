import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth as AuthComponent } from './auth';
import { Auth as AuthService } from '../../core/auth/auth';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { signal } from '@angular/core';

describe('Auth', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;
  let mockAuthService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockAuthService = {
      isInitializing: signal(false),
      isAdmin: signal(false),
      login: vi.fn()
    };
    mockRouter = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    TestBed.overrideComponent(AuthComponent, {
      set: {
        templateUrl: undefined,
        styleUrls: undefined,
        template: '<div></div>',
        styles: []
      }
    });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
