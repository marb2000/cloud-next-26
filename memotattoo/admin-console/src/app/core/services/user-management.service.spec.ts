import { TestBed } from '@angular/core/testing';
import { UserManagementService, FirebaseUser } from './user-management.service';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { of } from 'rxjs';

// Mock Firestore exports from the local firebase config
vi.mock('../firebase/firebase', () => ({
  firestore: {}
}));

// Mock only the necessary Firestore SDK functions
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  onSnapshot: vi.fn(),
  doc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getFirestore: vi.fn() // Add this to prevent errors even if firebase.ts isn't fully mocked
}));

import { onSnapshot } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';

describe('UserManagementService', () => {
  let service: UserManagementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserManagementService);
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should map and sort users correctly (banned at bottom)', async () => {
    const mockUsers = [
      { id: '1', data: () => ({ email: 'a@test.com', energy_bolts: 100, isBanned: false, isPro: true, interests: [] }) },
      { id: '2', data: () => ({ email: 'b@test.com', energy_bolts: 50, isBanned: true, isPro: false, interests: [] }) },
      { id: '3', data: () => ({ email: 'c@test.com', energy_bolts: 200, isBanned: false, isPro: false, interests: [] }) },
    ];

    (onSnapshot as any).mockImplementation((q: any, cb: any) => {
      // Wrap it to simulate snapshot object with forEach
      const snap = {
        forEach: (fn: any) => mockUsers.forEach(u => fn(u))
      };
      cb(snap);
      return () => {};
    });

    const users = await firstValueFrom(service.getUsers());
    
    expect(users.length).toBe(3);
    // Correct sorting: 200 bolts (c), 100 bolts (a), then Banned (b)
    expect(users[0].id).toBe('3');
    expect(users[1].id).toBe('1');
    expect(users[2].id).toBe('2');
  });
});
