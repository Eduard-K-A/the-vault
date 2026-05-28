import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Card, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { getLocalDbState } from '@/db/localDb';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatDate } from '@/utils/formatDate';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function AuditLogScreen() {
  const navigation = useNavigation<Navigation>();
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const logs = getLocalDbState().auditLogs.filter((log) => log.business_id === businessId);

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  return (
    <Screen title="POSly" onBack={handleBack}>
      <View style={styles.header}>
        <Text style={styles.title}>Audit log</Text>
        <Text style={styles.subtitle}>Trace of business actions.</Text>
      </View>
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
              <Text style={styles.meta} numberOfLines={3}>
                {JSON.stringify(item.payload)}
              </Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: dimensions.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  card: {
    gap: dimensions.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  type: {
    ...typography.subtitle,
    color: colors.text,
  },
  meta: {
    color: colors.textMuted,
  },
});
