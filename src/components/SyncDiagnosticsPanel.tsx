import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSyncStatus } from '@/hooks/useSyncStatus';

function formatValue(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? 'Unavailable' : String(value);
}

export function SyncDiagnosticsPanel() {
  const sync = useSyncStatus();
  const authStatus = useAuthStore((state) => state.status);
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);

  const rows = [
    ['Network', sync.isOnline ? 'Online' : 'Offline'],
    ['Sync phase', sync.phase],
    ['Pending uploads', sync.pendingUploadCount],
    ['Failed uploads', sync.failedUploadCount],
    ['Last synced', sync.lastSyncedAt],
    ['Last error code', sync.lastErrorCode],
    ['Last error', sync.lastError],
    ['Auth', authStatus],
    ['Business', business?.name],
    ['Branch', branch?.name],
  ] as const;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Sync diagnostics</Text>
      <View style={styles.rows}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{formatValue(value)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: dimensions.sm,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
  },
  rows: {
    gap: dimensions.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: dimensions.md,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  value: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
});
