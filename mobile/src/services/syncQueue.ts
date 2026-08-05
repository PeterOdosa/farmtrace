/**
 * Sync Queue — persistent queue for pending write operations.
 *
 * Queue items are stored in MMKV so they survive app restarts.
 * When the device comes back online, the sync engine replays
 * queued actions against Supabase, then removes them on success.
 */

import { MMKV } from 'react-native-mmkv';
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { networkStatus } from './connectionMonitor';

// --- Types ---

export interface SyncQueueItem {
  id: string;
  table: string;
  method: 'insert' | 'update' | 'delete';
  payload: Record<string, any>;
  filter: Record<string, any> | null; // for update/delete
  createdAt: number;
  attemptCount: number;
  lastError: string | null;
}

export type SyncStats = {
  pending: number;
  total: number;
  oldest: number | null;
};

export type SyncStatus = 'synced' | 'pending' | 'syncing';

export interface AddSyncActionOptions {
  action: string;
  table: string;
  method: 'insert' | 'update' | 'delete';
  payload: Record<string, any>;
  filter?: Record<string, any>;
  priority?: number;
}

// --- MMKV instance ---

const storage = new MMKV();
const STORAGE_KEY = 'farmtrace_sync_queue';
const MAX_RETRIES = 5;

// --- Public API ---

/**
 * Queue a write action. Called when offline or as a backup when online.
 */
export function addSyncAction(opts: AddSyncActionOptions): string {
  const queue = getQueue();
  const item: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    table: opts.table,
    method: opts.method,
    payload: opts.payload,
    filter: opts.filter ?? null,
    createdAt: Date.now(),
    attemptCount: 0,
    lastError: null,
  };
  queue.unshift(item);
  saveQueue(queue);
  return item.id;
}

/**
 * Process the queue — replay pending actions in FIFO order.
 * Returns the number of successfully processed items.
 * Only runs if network is connected.
 */
export async function processQueue(): Promise<number> {
  if (!networkStatus.isConnected) return 0;

  const queue = getQueue();
  if (queue.length === 0) return 0;

  let processed = 0;

  for (const item of queue) {
    const success = await attemptSync(item);
    if (success) {
      processed++;
    } else {
      break; // Stop on first failure — FIFO order
    }
  }

  return processed;
}

/**
 * Get the current queue as an array.
 */
export function getQueue(): SyncQueueItem[] {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Get sync statistics.
 */
export function getSyncStats(): SyncStats {
  const queue = getQueue();
  const pending = queue.filter(
    (q) => q.attemptCount > 0 || q.lastError !== null
  );
  const oldest = pending.length > 0
    ? Math.min(...pending.map((q) => q.createdAt))
    : null;
  return {
    pending: pending.length,
    total: queue.length,
    oldest,
  };
}

/**
 * Check if there are pending (failed or retried) actions.
 */
export function hasPendingActions(): boolean {
  const queue = getQueue();
  return queue.some((q) => q.attemptCount > 0 || q.lastError !== null);
}

/**
 * Get the current sync status indicator.
 */
export function getSyncStatus(): SyncStatus {
  const queue = getQueue();
  if (queue.length === 0) return 'synced';
  if (!networkStatus.isConnected) return 'pending';
  return hasPendingActions() ? 'pending' : 'synced';
}

/**
 * Clear the entire sync queue. Use with caution.
 */
export function clearQueue(): void {
  saveQueue([]);
}

/**
 * Remove a specific item from the queue.
 */
export function removeItem(itemId: string): void {
  const queue = getQueue().filter((q) => q.id !== itemId);
  saveQueue(queue);
}

// --- Hook for React components ---

export function useSyncQueue() {
  const { isConnected, hasChanged } = networkStatus as any;
  const [queueLength, setQueueLength] = useState(0);
  const [status, setStatus] = useState<SyncStatus>('synced');
  let _hasChanged = false;
  let _isConnected = true;

  const refreshStatus = useCallback(() => {
    const stats = getSyncStats();
    setQueueLength(stats.total);
    setStatus(getSyncStatus());
  }, []);

  const addSyncActionFn = useCallback((opts: AddSyncActionOptions): string => {
    return addSyncActionInternal(opts);
  }, []);

  const processQueueFn = useCallback(async (): Promise<number> => {
    return processQueue();
  }, []);

  // Auto-process when connection changes
  useEffect(() => {
    refreshStatus();

    if (_isConnected && _hasChanged) {
      processQueue().then((processed) => {
        if (processed > 0) {
          setTimeout(refreshStatus, 500);
        }
      });
    }
  }, [isConnected, hasChanged, refreshStatus]);

  // Refresh periodically (every 30s) while online
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [isConnected, refreshStatus]);

  return {
    addSyncAction: addSyncActionFn,
    processQueue: processQueueFn,
    queueLength,
    pendingCount: queueLength, // alias for backward compatibility
    status,
    isConnected, // expose connection state for SyncStatusIndicator
    refreshStatus,
  };
}

// --- Private helpers ---

function addSyncActionInternal(opts: AddSyncActionOptions): string {
  const queue = getQueue();
  const item: SyncQueueItem = {
    id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    table: opts.table,
    method: opts.method,
    payload: opts.payload,
    filter: opts.filter ?? null,
    createdAt: Date.now(),
    attemptCount: 0,
    lastError: null,
  };
  queue.unshift(item);
  saveQueue(queue);
  return item.id;
}

async function attemptSync(item: SyncQueueItem): Promise<boolean> {
  try {
    let success = false;
    switch (item.method) {
      case 'insert':
        await supabase.from(item.table).insert(item.payload);
        success = true;
        break;
      case 'update':
        if (item.filter) {
          await supabase.from(item.table).update(item.payload).match(item.filter);
        } else {
          throw new Error('Update requires a filter');
        }
        success = true;
        break;
      case 'delete':
        if (item.filter) {
          await supabase.from(item.table).delete().match(item.filter);
        } else {
          throw new Error('Delete requires a filter');
        }
        success = true;
        break;
      default:
        throw new Error(`Unknown method: ${item.method}`);
    }

    // Success — remove from queue
    const queue = getQueue();
    const newQueue = queue.filter((q) => q.id !== item.id);
    saveQueue(newQueue);
    return true;
  } catch (err: any) {
    // Failed — update attempt count and error
    const queue = getQueue();
    const idx = queue.findIndex((q) => q.id === item.id);
    if (idx !== -1) {
      queue[idx].attemptCount += 1;
      queue[idx].lastError = err.message;
      saveQueue(queue);
    }

    if (queue[idx]?.attemptCount >= MAX_RETRIES) {
      console.warn(`Sync failed after ${MAX_RETRIES} attempts: ${item.table}`, queue[idx]?.lastError);
    }
    return false;
  }
}

function saveQueue(queue: SyncQueueItem[]) {
  storage.set(STORAGE_KEY, JSON.stringify(queue));
}
