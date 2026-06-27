import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Badge, Card, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatDate } from '@/utils/formatDate';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import type { RootStackParamList } from '@/types/navigation';
import type { AuditLog } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function AuditLogScreen() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Navigation>();
  const businessId = useBusinessStore((state) => state.activeBusiness?.id ?? null);
  const role = useAuthStore((state) => state.role);
  const { data: logRows } = useQuery<AuditLog>('SELECT * FROM audit_logs WHERE business_id = ?', [businessId ?? '']);
  const logs = (logRows as AuditLog[]).filter((log) => log.business_id === businessId);

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  return (
    <Screen title="Audit log" subtitle="Trace of business actions." onBack={handleBack}>
      {role !== 'owner' ? (
        <EmptyState title="Owner only" description="Audit logs are visible to business owners only." />
      ) : logs.length === 0 ? (
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
              <Text style={styles.meta}>
                {item.branch_id ? `Branch: ${item.branch_id} · ` : ''}
                {item.source_device_id ? `Device: ${item.source_device_id}` : 'Device: unknown'}
              </Text>
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
