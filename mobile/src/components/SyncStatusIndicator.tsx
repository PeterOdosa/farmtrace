/**
 * Sync Status Indicator — shows sync state in the app header.
 *
 * Displays:
 * - ✅ Synced (green checkmark) when all data is up-to-date
 * - ⏳ Syncing (blue spinner) when actively syncing
 * - ⚠️ X pending (orange) when there are queued items
 * - 📴 Offline (red) when device is offline
 * - 📶 Connected (subtle) when just reconnected
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSyncQueue } from '../services/syncQueue';
import { colors } from '../config/colors';
import { processQueue } from '../services/syncQueue';

export default function SyncStatusIndicator({ onPress }: { onPress?: () => void }) {
  const { status, pendingCount, isConnected } = useSyncQueue();

  // Don't show anything if fully synced and online
  if (status === 'synced' && isConnected) return null;

  const getSyncLabel = (): { text: string; color: string; showSpinner: boolean } => {
    if (!isConnected) {
      return { text: 'Offline', color: '#dc2626', showSpinner: false };
    }

    switch (status) {
      case 'syncing':
        return { text: 'Syncing...', color: '#2563eb', showSpinner: true };
      case 'pending':
        return { text: `${pendingCount} pending`, color: '#ea580c', showSpinner: false };
      default:
        return { text: 'Synced', color: '#16a34a', showSpinner: false };
    }
  };

  const syncInfo = getSyncLabel();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (status === 'pending' && isConnected) {
      processQueue();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, syncInfo.color && { borderColor: syncInfo.color }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {syncInfo.showSpinner ? (
        <ActivityIndicator size="small" color={syncInfo.color} />
      ) : (
        <Text style={[styles.icon, { color: syncInfo.color }]}>
          {status === 'synced' ? '✅' : status === 'pending' ? '⚠️' : '📴'}
        </Text>
      )}
      <Text style={[styles.label, { color: syncInfo.color }]}>
        {syncInfo.text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
