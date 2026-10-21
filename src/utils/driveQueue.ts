/**
 * Resilient Persistent Google Drive Upload Queue
 * Allows instant snapping/drawing in obra without waiting.
 * Queues, compresses, uploads in background and syncs with Supabase.
 */

import { uploadFileToDrive, isDriveUrl } from '../lib/driveUpload';
import { saveLocalImage, getLocalImage, deleteLocalImage } from './localImageStore';

export interface DriveQueueItem {
  id: string; // Unique queue task ID
  type: 'sketch' | 'photo';
  projectId: string;
  projectName?: string;
  unitId: string;
  unitName?: string;
  tradeId?: string;
  itemId?: string;
  targetId: string; // ID of the sketch or photo
  filename: string;
  attempts: number;
  createdAt: number;
}

const QUEUE_STORAGE_KEY = 'check_list_drive_queue_v2';
let isProcessing = false;
type UploadCallback = (item: DriveQueueItem, driveUrl: string) => void;
const uploadListeners: UploadCallback[] = [];

export function subscribeToDriveUploads(cb: UploadCallback): () => void {
  uploadListeners.push(cb);
  return () => {
    const idx = uploadListeners.indexOf(cb);
    if (idx !== -1) uploadListeners.splice(idx, 1);
  };
}

function loadQueue(): DriveQueueItem[] {
  try {
    const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading Drive upload queue:', e);
  }
  return [];
}

function saveQueue(queue: DriveQueueItem[]) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Error saving Drive upload queue:', e);
  }
}

/**
 * Enqueue a sketch or photo for background upload to Google Drive.
 * Resolves immediately so the user experiences zero lag (< 5ms).
 */
export async function enqueueDriveUpload(
  item: Omit<DriveQueueItem, 'id' | 'attempts' | 'createdAt'>,
  dataUrl: string
): Promise<void> {
  const taskId = `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const queueItem: DriveQueueItem = {
    ...item,
    id: taskId,
    attempts: 0,
    createdAt: Date.now()
  };

  // 1. Save dataUrl into indestructible IndexedDB store
  await saveLocalImage(item.targetId, dataUrl);

  // 2. Add to persistent queue
  const queue = loadQueue();
  queue.push(queueItem);
  saveQueue(queue);

  // 3. Trigger processing in background
  setTimeout(() => {
    processDriveQueue();
  }, 100);
}

/**
 * Background worker that processes the queue sequentially
 */
export async function processDriveQueue() {
  if (isProcessing) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return; // Wait for online event
  }

  const queue = loadQueue();
  if (queue.length === 0) return;

  isProcessing = true;

  try {
    while (queue.length > 0) {
      const current = queue[0];

      // Retrieve full image from IndexedDB
      let dataUrl = await getLocalImage(current.targetId);

      // If already a drive URL, nothing to upload
      if (!dataUrl || isDriveUrl(dataUrl)) {
        queue.shift();
        saveQueue(queue);
        continue;
      }

      try {
        console.log(`[DriveQueue] Subiendo ${current.type} "${current.filename}" a Google Drive...`);
        const res = await uploadFileToDrive({
          base64: dataUrl,
          filename: current.filename,
          mimeType: 'image/jpeg'
        });

        if (res && res.success && res.url && isDriveUrl(res.url)) {
          console.log(`[DriveQueue] Éxito! Guardado en Google Drive: ${res.url}`);
          
          // Notify listeners so App.tsx updates project state and syncs to Supabase
          uploadListeners.forEach(cb => {
            try {
              cb(current, res.url);
            } catch (err) {
              console.warn('Listener error in drive queue:', err);
            }
          });

          // Dispatch window event as backup
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('drive-item-synced', {
              detail: {
                ...current,
                driveUrl: res.url
              }
            }));
          }

          // Remove from queue
          queue.shift();
          saveQueue(queue);
        } else {
          console.warn('[DriveQueue] Intento de subida falló:', res?.error);
          current.attempts = (current.attempts || 0) + 1;
          saveQueue(queue);
          // Wait 3 seconds before trying next item
          await new Promise(r => setTimeout(r, 3000));
          break;
        }
      } catch (err) {
        console.warn('[DriveQueue] Excepción al procesar cola de Drive:', err);
        current.attempts = (current.attempts || 0) + 1;
        saveQueue(queue);
        break;
      }
    }
  } finally {
    isProcessing = false;
  }
}

// Auto-resume queue when network restores
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[DriveQueue] Conexión online detectada. Reanudando subidas pendientes a Drive...');
    processDriveQueue();
  });
}
