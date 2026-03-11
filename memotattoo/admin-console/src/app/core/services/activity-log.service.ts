import { Injectable } from '@angular/core';
import { collection, addDoc, query, orderBy, limit, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';
import { firestore } from '../../core/firebase/firebase';
import { Observable } from 'rxjs';

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

  /**
   * Returns a real-time Observable of the latest activity logs.
   */
  getLogs(maxBatch = 150): Observable<(ActivityLog & { id: string })[]> {
    return new Observable((subscriber) => {
      const q = query(this.collectionRef, orderBy('timestamp', 'desc'), limit(maxBatch));
      const unsubscribe = onSnapshot(q, (snap) => {
        const data: (ActivityLog & { id: string })[] = [];
        snap.forEach(docSnap => {
          data.push({ ...docSnap.data() as ActivityLog, id: docSnap.id });
        });
        subscriber.next(data);
      }, (error) => {
        subscriber.error(error);
      });
      return () => unsubscribe();
    });
  }

  /**
   * Resets/Drops all activity logs in the collection using batch deletion.
   */
  async dropLogs(): Promise<number> {
    let numDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const q = query(this.collectionRef, limit(500));
      const snapshot = await getDocs(q);

      if (snapshot.size === 0) {
        hasMore = false;
        break;
      }

      const batch = writeBatch(firestore);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
      numDeleted += snapshot.size;
    }
    return numDeleted;
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
