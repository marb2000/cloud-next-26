import { TestBed } from '@angular/core/testing';
import { FlashcardService, FlashcardDeck } from './flashcard.service';
import { firestore } from '../firebase/firebase';
import { doc, getDoc, onSnapshot, query, collection } from 'firebase/firestore';
import { of } from 'rxjs';

// Mock Firebase
vi.mock('../firebase/firebase', () => ({
  firestore: {}
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  onSnapshot: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  orderBy: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  addDoc: vi.fn(),
  getFirestore: vi.fn()
}));

describe('FlashcardService', () => {
  let service: FlashcardService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FlashcardService);
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDecks', () => {
    it('should map legacy data structures correctly', (done) => {
      const mockSnapshot = {
        docs: [
          {
            id: 'legacy-deck',
            data: () => ({
              contentBase: {
                title: 'Legacy Title',
                items: [{ term: 'T1', definition: 'D1' }],
                previewImages: ['img1.png']
              }
              // topic, previewImages, items are missing at root
            })
          }
        ]
      };

      (onSnapshot as any).mockImplementation((q: any, callback: any) => {
        callback(mockSnapshot);
        return () => {};
      });

      return new Promise<void>((resolve) => {
        service.getDecks().subscribe(decks => {
          expect(decks.length).toBe(1);
          expect(decks[0].topic).toBe('Legacy Title');
          expect(decks[0].previewImages).toEqual(['img1.png']);
          expect(decks[0].items?.length).toBe(1);
          resolve();
        });
      });
    });
  });

  describe('getDeckById', () => {
    it('should map legacy data correctly', async () => {
      const mockDocSnap = {
        exists: () => true,
        id: 'legacy-id',
        data: () => ({
          contentBase: {
            title: 'Legacy Title',
            items: [{ term: 'T1', definition: 'D1' }],
            previewImages: ['img1.png']
          }
        })
      };

      (getDoc as any).mockResolvedValue(mockDocSnap);

      const deck = await service.getDeckById('legacy-id');
      expect(deck).toBeTruthy();
      expect(deck?.topic).toBe('Legacy Title');
      expect(deck?.previewImages).toEqual(['img1.png']);
      expect(deck?.items?.length).toBe(1);
    });
  });
});
