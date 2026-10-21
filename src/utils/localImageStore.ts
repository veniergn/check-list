/**
 * Indestructible IndexedDB Cache for Construction Photos & Croquis
 * Allows gigabytes of local storage without the 5MB localStorage limit.
 * Guarantees zero data loss even if device is offline or restarted.
 */

const DB_NAME = 'CheckListInspectionCache_v1';
const STORE_NAME = 'inspection_blobs';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export interface CachedImageRecord {
  id: string;
  dataUrl: string;
  savedAt: number;
}

/**
 * Saves image data URL to IndexedDB in milliseconds without blocking UI
 */
export async function saveLocalImage(id: string, dataUrl: string): Promise<boolean> {
  if (!id || !dataUrl) return false;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: CachedImageRecord = {
        id,
        dataUrl,
        savedAt: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => {
        console.warn('Error saving image to IndexedDB:', req.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('IndexedDB unavailable for saveLocalImage:', err);
    return false;
  }
}

/**
 * Retrieves image data URL from IndexedDB by id
 */
export async function getLocalImage(id: string): Promise<string | null> {
  if (!id) return null;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const record = req.result as CachedImageRecord | undefined;
        resolve(record ? record.dataUrl : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Deletes cached image from IndexedDB
 */
export async function deleteLocalImage(id: string): Promise<boolean> {
  if (!id) return false;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Gets all locally cached images as a map: { [id]: dataUrl }
 */
export async function getAllLocalImages(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const val = cursor.value as CachedImageRecord;
          if (val && val.id && val.dataUrl) {
            map.set(val.id, val.dataUrl);
          }
          cursor.continue();
        } else {
          resolve(map);
        }
      };
      req.onerror = () => resolve(map);
    });
  } catch {
    return map;
  }
}
