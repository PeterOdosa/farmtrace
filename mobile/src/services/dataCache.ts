/**
 * Data cache — stores farm and road data in MMKV for offline access.
 *
 * When the app is offline:
 * - Dashboard shows cached farms list
 * - Field detail shows cached roads
 * - No API calls are attempted
 *
 * When the app goes back online:
 * - Cached data is refreshed from the server
 * - Stale items are pruned
 *
 * TTL: 5 minutes for farm list, 10 minutes for individual farm details.
 */

import { MMKV } from 'react-native-mmkv';
import { useState, useCallback } from 'react';

// --- MMKV instances ---

const cacheStorage = new MMKV();

// --- Keys ---

const CACHE_PREFIX = 'farmtrace_cache:';
const EXPIRY_PREFIX = 'farmtrace_expiry:';

// TTL values (milliseconds)
const FARM_LIST_TTL = 5 * 60 * 1000;    // 5 minutes
const FARM_DETAIL_TTL = 10 * 60 * 1000;  // 10 minutes
const ROADS_TTL = 10 * 60 * 1000;        // 10 minutes

// --- Types ---

export interface FarmListItem {
  id: string;
  name: string;
  crop_type: string;
  area_hectares: number;
  perimeter_km: number;
  updated_at: string;
}

export interface FarmDetail extends FarmListItem {
  boundary?: any;
}

export interface RoadItem {
  id: string;
  farm_id: string;
  label: string;
  path: any;
  length_km: number;
  created_at: string;
}

// --- Helpers ---

function cacheKey(type: 'farms' | 'farm' | 'roads', id?: string): string {
  return `${CACHE_PREFIX}${type}:${id ?? ''}`;
}

function expiryKey(type: 'farms' | 'farm' | 'roads', id?: string): string {
  return `${EXPIRY_PREFIX}${type}:${id ?? ''}`;
}

function isExpired(type: 'farms' | 'farm' | 'roads', id?: string): boolean {
  const expiry = cacheStorage.getString(expiryKey(type, id));
  if (!expiry) return true;
  return Date.now() > Number(expiry);
}

function setExpiry(type: 'farms' | 'farm' | 'roads', id?: string, ttl?: number): void {
  cacheStorage.set(expiryKey(type, id), String(Date.now() + (ttl ?? FARM_LIST_TTL)));
}

// --- Farm List Cache ---

export function getCachedFarms(): FarmListItem[] | null {
  if (isExpired('farms')) return null;
  const raw = cacheStorage.getString(cacheKey('farms'));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedFarms(farms: FarmListItem[]): void {
  cacheStorage.set(cacheKey('farms'), JSON.stringify(farms));
  setExpiry('farms', undefined, FARM_LIST_TTL);
}

// --- Farm Detail Cache ---

export function getCachedFarm(farmId: string): FarmDetail | null {
  if (isExpired('farm', farmId)) return null;
  const raw = cacheStorage.getString(cacheKey('farm', farmId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedFarm(farmId: string, farm: FarmDetail): void {
  cacheStorage.set(cacheKey('farm', farmId), JSON.stringify(farm));
  setExpiry('farm', farmId, FARM_DETAIL_TTL);
}

// --- Roads Cache ---

export function getCachedRoads(farmId: string): RoadItem[] | null {
  if (isExpired('roads', farmId)) return null;
  const raw = cacheStorage.getString(cacheKey('roads', farmId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCachedRoads(farmId: string, roads: RoadItem[]): void {
  cacheStorage.set(cacheKey('roads', farmId), JSON.stringify(roads));
  setExpiry('roads', farmId, ROADS_TTL);
}

// --- Clear All Cache ---

export function clearAllCache(): void {
  const allKeys = cacheStorage.getAllKeys();
  const toRemove = allKeys.filter((k) =>
    k.startsWith(CACHE_PREFIX) || k.startsWith(EXPIRY_PREFIX)
  );
  toRemove.forEach((key) => cacheStorage.delete(key));
}

// --- Prune Expired ---

export function pruneExpired(): void {
  const allKeys = cacheStorage.getAllKeys();

  const expiryKeys = allKeys.filter((k) =>
    k.startsWith(EXPIRY_PREFIX)
  );

  for (const expiryKey of expiryKeys) {
    const expiry = Number(cacheStorage.getString(expiryKey));
    if (Date.now() > expiry) {
      cacheStorage.delete(expiryKey);
      const cacheKeyStr = expiryKey.replace(EXPIRY_PREFIX, CACHE_PREFIX);
      cacheStorage.delete(cacheKeyStr);
    }
  }
}

// --- FarmCache (named object for imports like `farmCache.saveFarm`) ---

export const farmCache = {
  get: (farmId: string): FarmDetail | null => getCachedFarm(farmId),
  set: (farmId: string, farm: FarmDetail): void => setCachedFarm(farmId, farm),
  /** Save a farm object to cache (used after online save or offline queue) */
  save: (farmId: string, payload: { name: string; crop_type?: string | null }): void => {
    const farm: FarmDetail = {
      id: farmId,
      name: payload.name,
      crop_type: payload.crop_type || '',
      area_hectares: 0,
      perimeter_km: 0,
      updated_at: new Date().toISOString(),
    };
    setCachedFarm(farmId, farm);
  },
};

// --- useDataCache hook (returns all cache methods for React components) ---

export function useDataCache() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    getCachedFarms,
    getCachedFarm,
    getCachedRoads,
    setCachedFarms,
    setCachedFarm,
    setCachedRoads,
    clearAllCache,
    pruneExpired,
    farmCache,
    refreshKey,
    refresh,
  };
}
