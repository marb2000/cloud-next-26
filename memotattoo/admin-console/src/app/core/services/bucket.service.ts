import { Injectable } from '@angular/core';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/firebase';

@Injectable({
  providedIn: 'root'
})
export class BucketService {

  constructor() { }

  /**
   * Universal upload method for base64/dataURL images
   * @param base64Data The image data URI
   * @param path The target path in storage (e.g. 'drafts/image.jpg')
   */
  async uploadImage(base64Data: string, path: string): Promise<string> {
    if (base64Data.startsWith('http')) return base64Data;
    if (!base64Data.startsWith('data:')) return base64Data;
    
    const storageRef = ref(storage, path);
    await uploadString(storageRef, base64Data, 'data_url');
    return await getDownloadURL(storageRef);
  }

  /**
   * Specialized helper for draft images
   */
  async uploadDraftImage(base64Data: string, prefix: string = 'memotattoo'): Promise<string> {
    const fileName = `drafts/${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.jpg`;
    return this.uploadImage(base64Data, fileName);
  }
}
