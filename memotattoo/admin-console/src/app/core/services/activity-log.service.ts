import { Injectable } from '@angular/core';
import { collection, addDoc } from 'firebase/firestore';
import { firestore } from '../../core/firebase/firebase';

export type LogIntent = 'info' | 'success' | 'warning' | 'error';

export interface ActivityLog {
  action: string;
  description: string;
  timestamp: string;
  intent: LogIntent;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityLogService {
  private readonly collectionRef = collection(firestore, 'ActivityLogs');

  constructor() {}

  async info(action: string, description: string, metadata?: any) {
    await this.log(action, description, 'info', metadata);
  }

  async success(action: string, description: string, metadata?: any) {
    await this.log(action, description, 'success', metadata);
  }

  async warning(action: string, description: string, metadata?: any) {
    await this.log(action, description, 'warning', metadata);
  }

  async error(action: string, description: string, errorObj?: any) {
    let meta = errorObj;
    if (errorObj instanceof Error) {
       meta = { message: errorObj.message, stack: errorObj.stack };
    }
    await this.log(action, description, 'error', meta);
  }

  private async log(action: string, description: string, intent: LogIntent, metadata?: any) {
    const payload: ActivityLog = {
      action,
      description,
      timestamp: new Date().toISOString(),
      intent,
      metadata: metadata || null
    };

    try {
      await addDoc(this.collectionRef, payload);
    } catch (e) {
      console.error("CRITICAL: Failed to write to ActivityLogs collection. Original log was:", payload, e);
    }
  }
}
