/**
 * Persistent Tombstone Tracking for Deleted Checklist Items
 * Ensures deleted items are pruned permanently across all devices,
 * local storage, Supabase, and Google Drive backups.
 */

const TOMBSTONE_STORAGE_KEY = 'control_avance_deleted_item_ids';

export function getStoredDeletedItemIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(TOMBSTONE_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {}
  return new Set();
}

export function saveDeletedItemId(itemId: string, unitId?: string, projectId?: string): void {
  if (typeof window === 'undefined' || !itemId) return;
  try {
    const set = getStoredDeletedItemIds();
    set.add(itemId);
    if (unitId) set.add(`${unitId}:${itemId}`);
    if (projectId && unitId) set.add(`${projectId}:${unitId}:${itemId}`);
    localStorage.setItem(TOMBSTONE_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

export function isItemDeleted(itemId: string, unitId?: string, deletedSet?: Set<string>): boolean {
  if (!itemId) return false;
  const set = deletedSet || getStoredDeletedItemIds();
  if (set.has(itemId)) return true;
  if (unitId && set.has(`${unitId}:${itemId}`)) return true;
  return false;
}

export function pruneDeletedItems<T extends { id: string }>(
  items: T[],
  unitId?: string,
  deletedSet?: Set<string>
): T[] {
  if (!Array.isArray(items)) return [];
  const set = deletedSet || getStoredDeletedItemIds();
  if (set.size === 0) return items;
  return items.filter(item => !isItemDeleted(item.id, unitId, set));
}
