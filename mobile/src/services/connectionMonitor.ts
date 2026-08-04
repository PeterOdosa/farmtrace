/**
 * Network connection monitor using @react-native-community/netinfo.
 *
 * Tracks connection state and provides:
 * - isConnected: boolean
 * - connectionInfo: type + details (wifi, cellular, etc.)
 *
 * Exports both a hook and a static object for non-React contexts.
 */

import { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Static state that persists outside React
let currentIsConnected = true;
let currentConnectionType: string = 'unknown';
const listeners: Set<() => void> = new Set();

async function initialize() {
  try {
    const state = await NetInfo.fetch();
    currentIsConnected = state.isConnected ?? true;
    currentConnectionType = state.type ?? 'unknown';
  } catch {
    currentIsConnected = false;
    currentConnectionType = 'unknown';
  }
}

async function subscribe() {
  try {
    const subPromise = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = currentIsConnected;
      currentIsConnected = state.isConnected ?? true;
      currentConnectionType = state.type ?? 'unknown';

      if (wasConnected !== currentIsConnected) {
        listeners.forEach((cb) => cb());
      }
    });
    // Wait for the promise to resolve, then call the unsubscribe
    const unsubscribe = await subPromise;
    return unsubscribe;
  } catch {
    return () => {};
  }
}

export const networkStatus = {
  get isConnected() { return currentIsConnected; },
  get connectionType() { return currentConnectionType; },
};

export type ConnectionType = string;

export function useConnectionMonitor(): {
  isConnected: boolean;
  connectionType: string;
  hasChanged: boolean;
} {
  const [state, setState] = useState({
    isConnected: currentIsConnected,
    connectionType: currentConnectionType,
    hasChanged: false,
  });

  const onChange = useCallback(() => {
    setState((prev) => ({
      isConnected: currentIsConnected,
      connectionType: currentConnectionType,
      hasChanged: true,
    }));
    // Reset hasChanged flag
    setTimeout(() => {
      setState((prev) => ({ ...prev, hasChanged: false }));
    }, 100);
  }, []);

  useEffect(() => {
    initialize();
    const unsubPromise = subscribe();
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
      unsubPromise.then((unsub) => unsub?.());
    };
  }, [onChange]);

  return state;
}
