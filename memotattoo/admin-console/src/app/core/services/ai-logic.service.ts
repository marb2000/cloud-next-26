import { Injectable, inject } from '@angular/core';
import { ai } from '../firebase/firebase';
import { getTemplateGenerativeModel, TemplateChatSession } from 'firebase/ai';
import { BucketService } from './bucket.service';

const templateModel = getTemplateGenerativeModel(ai);

@Injectable({
  providedIn: 'root'
})
export class AILogicService {
  private bucketService = inject(BucketService);

  constructor() { }

  async brainstormTopic(topic: string, numConcepts: number): Promise<any> {
    const result = await templateModel.generateContent('memotattoo-generatate-topic-v1', {
      topic,
      numConcepts
    });
    const text = result.response.text();
    return this.parseJSONResponse(text);
  }

  async brainstormMore(topic: string, existingTerms: string): Promise<any[]> {
    const result = await templateModel.generateContent('memotattoo-brainstorm-more-v1', {
      topic,
      existing_terms: existingTerms
    });
    const text = result.response.text();
    const parsed = this.parseJSONResponse(text);
    return Array.isArray(parsed) ? parsed : [];
  }

  async generateConceptImage(concept: any, title: string, artDirection?: string, artDirectionImage?: string): Promise<string | null> {
    const inputs: any = {
      title,
      term: concept.term,
      definition: concept.definition,
      art_direction: artDirection || "None",
      resolution: "2K" // Mandatory field in schema
    };

    if (artDirectionImage) {
      // Decode image if it's a data URL
      const mimeMatch = artDirectionImage.match(/^data:(image\/[a-zA-Z]*);base64,(.*)$/);
      if (mimeMatch) {
        inputs.art_reference_image = {
          mime_type: mimeMatch[1],
          contents: mimeMatch[2]
        };
      }
    }

    const result = await templateModel.generateContent('memotattoo-generate-concept-image-v1', inputs);
    return this.extractImagePayload(result);
  }

  async refineConceptImage(concept: any, existingImageBase64: string, refinePrompt: string): Promise<string | null> {
    // Extract raw base64 data and mime type
    const mimeMatch = existingImageBase64.match(/^data:(image\/[a-zA-Z]*);base64,(.*)$/);
    if (!mimeMatch) throw new Error("Could not parse base64 image data.");

    const mimeType = mimeMatch[1];
    const data = mimeMatch[2];

    const inputs = {
      // Per refine-image-v1.prompt, schema uses inline_images (array)
      inline_images: [{
        mime_type: mimeType,
        contents: data
      }],
      modification_prompt: refinePrompt
    };

    const result = await templateModel.generateContent('memotattoo-refine-image-v1', inputs);
    return this.extractImagePayload(result);
  }

  startGameMasterChat(
    concept: any,
    onAddPoints: (args: any) => Promise<any>,
    onNextConcept: (args: any) => Promise<any>,
    history: any[] = []
  ): TemplateChatSession {
    console.log("Starting GM Chat with concept:", concept.term);

    const vars = {
      term: concept.term,
      definition: concept.definition
    };

    const functionTools = [
      {
        name: "add_points",
        parameters: {
          type: "OBJECT",
          properties: { points: { type: "NUMBER", description: "Points to award" } },
          required: ["points"]
        },
        functionReference: onAddPoints,
        callable: onAddPoints
      },
      {
        name: "next_concept",
        parameters: { type: "OBJECT", properties: {} },
        functionReference: onNextConcept,
        callable: onNextConcept
      }
    ];

    return templateModel.startChat({
      templateId: 'memotattoo-game-master-v1',
      inputs: vars,
      templateVariables: vars,
      history: history,
      autoFunctions: functionTools,
      tools: [{ functionDeclarations: functionTools }]
    } as any);
  }

  /**
   * High-level wrapper that generates and automatically persists the image to Firebase Storage
   */
  async generateAndPersistConceptImage(concept: any, title: string, artDirection?: string, artDirectionImage?: string): Promise<string | null> {
    const base64 = await this.generateConceptImage(concept, title, artDirection, artDirectionImage);
    if (!base64) return null;
    return await this.uploadAIImage(base64);
  }

  /**
   * High-level wrapper that refines and automatically persists the image to Firebase Storage
   */
  async refineAndPersistConceptImage(concept: any, existingImage: string, refinePrompt: string): Promise<string | null> {
    const base64 = await this.refineConceptImage(concept, existingImage, refinePrompt);
    if (!base64) return null;
    return await this.uploadAIImage(base64);
  }

  async uploadAIImage(base64Data: string): Promise<string> {
    return this.bucketService.uploadDraftImage(base64Data, 'memotattoo');
  }

  private extractImagePayload(result: any): string | null {
    const candidateObj = result.response.candidates?.[0];
    const inlineData = candidateObj?.content?.parts?.find((p: any) => p.inlineData)?.inlineData;

    if (inlineData) {
      return `data:${inlineData.mimeType};base64,${inlineData.data}`;
    } else {
      const urlStr = result.response.text();
      if (urlStr.startsWith("http") || urlStr.startsWith("data:")) {
        return urlStr;
      }
      return null;
    }
  }

  private parseJSONResponse(text: string): any {
    try {
      return JSON.parse(text.replace(/^```json\n|\n```$/g, ''));
    } catch (e) {
      console.error("Parse error in AILogicService:", e);
      throw new Error("Failed to parse AI output");
    }
  }
}
