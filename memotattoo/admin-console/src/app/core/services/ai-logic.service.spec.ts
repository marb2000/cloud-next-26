import { TestBed } from '@angular/core/testing';
import { AILogicService } from './ai-logic.service';
import { templateModel, ai } from '../firebase/firebase';
import { BucketService } from './bucket.service';
import { getGenerativeModel } from 'firebase/ai';

// Mock Firebase and Vertex AI
vi.mock('../firebase/firebase', () => ({
  ai: {},
  templateModel: {
    generateContent: vi.fn()
  }
}));

vi.mock('firebase/ai', () => ({
  getGenerativeModel: vi.fn()
}));

describe('AILogicService', () => {
  let service: AILogicService;
  let bucketServiceMock: any;

  beforeEach(() => {
    bucketServiceMock = {
      uploadDraftImage: vi.fn().mockResolvedValue('https://storage.url/image.jpg')
    };

    TestBed.configureTestingModule({
      providers: [
        AILogicService,
        { provide: BucketService, useValue: bucketServiceMock }
      ]
    });
    service = TestBed.inject(AILogicService);
    vi.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('brainstormTopic', () => {
    it('should call generateContent and parse JSON response', async () => {
      const mockResponse = {
        response: {
          text: vi.fn().mockResolvedValue('```json\n{"concepts": ["test"]}\n```')
        }
      };
      (templateModel.generateContent as any).mockResolvedValue(mockResponse);

      const result = await service.brainstormTopic('math', 5);

      expect(templateModel.generateContent).toHaveBeenCalledWith('memotattoo-generatate-topic-v1', {
        topic: 'math',
        numConcepts: 5
      });
      expect(result).toEqual({ concepts: ['test'] });
    });

    it('should throw error if JSON is invalid', async () => {
      const mockResponse = {
        response: {
          text: vi.fn().mockResolvedValue('invalid json')
        }
      };
      (templateModel.generateContent as any).mockResolvedValue(mockResponse);

      await expect(service.brainstormTopic('math', 5)).rejects.toThrow('Failed to parse AI output');
    });
  });

  describe('generateConceptImage', () => {
    it('should handle data URLs for artDirectionImage', async () => {
      const mockDataUrl = 'data:image/png;base64,ABC';
      const mockResponse = {
        response: {
          candidates: [{
            content: {
              parts: [{ inlineData: { mimeType: 'image/png', data: 'XYZ' } }]
            }
          }]
        }
      };
      (templateModel.generateContent as any).mockResolvedValue(mockResponse);

      const result = await service.generateConceptImage({ term: 'term', definition: 'def' }, 'title', 'sketch', mockDataUrl);

      expect(templateModel.generateContent).toHaveBeenCalledWith('memotattoo-generate-concept-image-v1', {
        title: 'title',
        term: 'term',
        definition: 'def',
        art_direction: 'sketch',
        resolution: '2K',
        art_reference_image: {
          mime_type: 'image/png',
          contents: 'ABC'
        }
      });
      expect(result).toBe('data:image/png;base64,XYZ');
    });
  });

  describe('startGameMasterChat', () => {
    it('should initialize chat with session instruction and tools', async () => {
      const mockModel = {
        startChat: vi.fn().mockResolvedValue({ id: 'chat-session' })
      };
      (getGenerativeModel as any).mockReturnValue(mockModel);

      const session = await service.startGameMasterChat({ term: 'test', definition: 'desc' });

      expect(getGenerativeModel).toHaveBeenCalledWith(ai, expect.objectContaining({
        model: 'gemini-2.5-flash',
        systemInstruction: expect.stringContaining('test')
      }));
      expect(session).toEqual({ id: 'chat-session' } as any);
    });
  });

  describe('generateAndPersistConceptImage', () => {
    it('should generate image and then upload it', async () => {
      const mockBase64 = 'data:image/png;base64,XYZ';
      vi.spyOn(service, 'generateConceptImage').mockResolvedValue(mockBase64);

      const result = await service.generateAndPersistConceptImage({ term: 't' }, 'title');

      expect(service.generateConceptImage).toHaveBeenCalled();
      expect(bucketServiceMock.uploadDraftImage).toHaveBeenCalledWith(mockBase64, 'memotattoo');
      expect(result).toBe('https://storage.url/image.jpg');
    });

    it('should return null if generation fails', async () => {
      vi.spyOn(service, 'generateConceptImage').mockResolvedValue(null);

      const result = await service.generateAndPersistConceptImage({ term: 't' }, 'title');

      expect(result).toBeNull();
      expect(bucketServiceMock.uploadDraftImage).not.toHaveBeenCalled();
    });
  });
});
