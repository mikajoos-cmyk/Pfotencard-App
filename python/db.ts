// In frontend/db.ts
import { openDB, DBSchema } from 'idb';

const DB_NAME = 'pfotencard-db';
const STORE_NAME = 'queued-requests';
const VERSION = 1;

interface PfotencardDB extends DBSchema {
  [STORE_NAME]: {
    key: number;
    value: {
      url: string;
      method: string;
      body: any;
      timestamp: number;
    };
  };
}

const dbPromise = openDB<PfotencardDB>(DB_NAME, VERSION, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME, { autoIncrement: true, keyPath: 'id' });
  },
});

export async function addQueuedRequest(request: Omit<PfotencardDB[typeof STORE_NAME]['value'], 'timestamp'>) {
  const db = await dbPromise;
  await db.add(STORE_NAME, { ...request, timestamp: Date.now() });
}

export async function getAllQueuedRequests() {
  const db = await dbPromise;
  return await db.getAll(STORE_NAME);
}

export async function deleteQueuedRequest(key: number) {
  const db = await dbPromise;
  await db.delete(STORE_NAME, key);
}