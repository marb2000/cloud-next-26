import { Injectable, inject } from '@angular/core';
import { ai } from '../firebase/firebase';
import { getGenerativeModel, getTemplateGenerativeModel, ChatSession } from 'firebase/ai';
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

  async startGameMasterChat(concept: any): Promise<ChatSession> {
    const model = getGenerativeModel(ai, {
      model: 'gemini-2.5-flash',
      systemInstruction: `You are the Game Master for a flashcard guessing game. 
You are testing the user on the term: "${concept.term}".
The definition of this term is: "${concept.definition}".
The user is currently looking at an AI-generated image representing this concept.

Your job:
1. Start the round by saying: "What am I thinking of?" or a similar inviting question.
2. Evaluate the user's guesses. 
3. If they guess exactly the term "${concept.term}", you MUST first explicitly state how many points you are awarding them and why (e.g. "Spot on! That's 10 points for getting it on the first try!"). 
4. Immediately after your explanation, MUST call the \`add_points\` function with the calculated score (max 10, lower if they needed many hints), followed immediately by the \`next_concept\` function to advance the game.
5. If their guess is very close or related, act as a helpful tutor and give them a hint (a 'pista') based on the definition to steer them closer. Do not give away the exact word unless time runs out.
6. Keep your responses short, energetic, and engaging!`,
      tools: [{
        functionDeclarations: [
          {
            name: "add_points",
            description: "Award points to the user for guessing correctly.",
            parameters: {
              type: "object",
              properties: { points: { type: "number", description: "Points to award, from 1 to 10." } },
              required: ["points"]
            }
          },
          {
            name: "next_concept",
            description: "Advances the game to the next flashcard concept.",
            parameters: { type: "object", properties: {} }
          }
        ]
      }]
    });

    return model.startChat();
  }

  async sendGameGuess(session: ChatSession, text: string): Promise<{ text: string, functionCalls?: any[] }> {
    const result = await session.sendMessage(text);
    return this.processAIResponse(session, result);
  }

  private async processAIResponse(session: ChatSession, result: any): Promise<{ text: string, functionCalls?: any[] }> {
    let textResponse = '';
    try {
      textResponse = result.response.text();
    } catch (e) {
      // It's normal for text() to throw an error if the response only contains function calls
    }

    const functionCalls = result.response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      // Return both the text and the calls so the component can perform the side effects (score update, advance)
      return { text: textResponse, functionCalls };
    }

    return { text: textResponse };
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
