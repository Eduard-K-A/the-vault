import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { getLocalDbState } from '@/db/localDb';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { formatDate } from '@/utils/formatDate';
import { useBusinessStore } from '@/store/businessStore';

export default function AuditLogScreen() {
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const logs = getLocalDbState().auditLogs.filter((log) => log.business_id === businessId);

  return (
    <Screen title="Audit log" subtitle="Owner-only trace of business actions.">
      {logs.length === 0 ? (
        <EmptyState title="No audit events" description="Actions will appear here when changes are recorded." />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: dimensions.sm }} />}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.type}>{item.event_type}</Text>
                <Badge label={formatDate(item.created_at)} tone="neutral" />
              </View>
              <Text style={styles.meta}>{JSON.stringify(item.payload)}</Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: dimensions.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  type: {
    color: colors.text,
    fontWeight: '700',
  },
  meta: {
    color: colors.textMuted,
  },
});

