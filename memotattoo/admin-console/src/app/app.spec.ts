import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Auth } from './core/auth/auth';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';

describe('App', () => {
  let mockAuth: any;

  beforeEach(async () => {
    mockAuth = {
      isAdmin: signal(true),
      currentUser: signal({ email: 'admin@test.com' }),
      isInitializing: signal(false)
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: mockAuth }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('span.text-transparent')?.textContent).toContain('MemoTattoo');
  });
});
