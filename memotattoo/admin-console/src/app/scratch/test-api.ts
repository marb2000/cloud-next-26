import { ai } from '../core/firebase/firebase';
import { getTemplateGenerativeModel } from 'firebase/ai';

const templateModel = getTemplateGenerativeModel(ai);

export function test() {
  const session = templateModel.startChat({
    templateId: 'test',
    inputs: { foo: 'bar' },
    autoFunctions: [
      { 
        name: 'testFunc', 
        callable: async (args: any) => { return { success: true }; } 
      }
    ]
  } as any);
}
