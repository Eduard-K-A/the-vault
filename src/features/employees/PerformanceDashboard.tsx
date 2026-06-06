import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@powersync/react';

import { Button, Card, Screen } from '@/components/ui';
import { EmptyState } from '@/components/EmptyState';
import { getOwnerAnalytics } from '@/db/queries/analyticsQueries';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { formatCurrency } from '@/utils/formatCurrency';
import { useAuthStore } from '@/store/authStore';
import type { RootStackParamList } from '@/types/navigation';
import type { AuditLog, Branch, Business, BusinessMember, Category, InventoryRecord, Payment, Profile, Product, Refund, RefundItem, Sale, SaleItem } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function PerformanceDashboard() {
  const navigation = useNavigation<Navigation>();
  const { data: profileRows } = useQuery<Profile>('SELECT * FROM profiles');
  const { data: businessRows } = useQuery<Business>('SELECT * FROM businesses');
  const { data: memberRows } = useQuery<BusinessMember>('SELECT * FROM business_members');
  const { data: branchRows } = useQuery<Branch>('SELECT * FROM branches');
  const { data: categoryRows } = useQuery<Category>('SELECT * FROM categories');
  const { data: productRows } = useQuery<Product>('SELECT * FROM products');
  const { data: inventoryRows } = useQuery<InventoryRecord>('SELECT * FROM inventory_items');
  const { data: saleRows } = useQuery<Sale>('SELECT * FROM sales');
  const { data: itemRows } = useQuery<SaleItem>('SELECT * FROM sale_items');
  const { data: paymentRows } = useQuery<Payment>('SELECT * FROM payments');
  const { data: refundRows } = useQuery<Refund>('SELECT * FROM refunds');
  const { data: refundItemRows } = useQuery<RefundItem>('SELECT * FROM refund_items');
  const { data: auditLogRows } = useQuery<AuditLog>('SELECT * FROM audit_logs');
  const business = (businessRows as Business[])[0] ?? null;
  const branch = (branchRows as Branch[])[0] ?? null;
  const state = {
    profiles: profileRows as Profile[],
    businesses: businessRows as Business[],
    businessMembers: memberRows as BusinessMember[],
    branches: branchRows as Branch[],
    categories: categoryRows as Category[],
    products: productRows as Product[],
    inventory: inventoryRows as InventoryRecord[],
    sales: saleRows as Sale[],
    saleItems: itemRows as SaleItem[],
    payments: paymentRows as Payment[],
    refunds: refundRows as Refund[],
    refundItems: refundItemRows as RefundItem[],
    inventoryLogs: [],
    auditLogs: auditLogRows as AuditLog[],
  };
  const analytics = business && branch ? getOwnerAnalytics(state, business.id, branch.id) : null;
  useAuthStore((store) => store.role);

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  if (!analytics) {
    return (
      <Screen title="Performance" subtitle="Employee performance dashboard." onBack={handleBack} scrollable contentStyle={styles.content}>
        <EmptyState title="No data" description="Performance charts appear after sales are recorded." />
      </Screen>
    );
  }

  const teamCount = analytics.leaderboard.length;
  const activeToday = Math.max(1, analytics.leaderboard.filter((item) => item.revenue > 0).length);

  return (
      <Screen
        title="Store POS"
        onBack={handleBack}
        action={<Button label="Invite" variant="primary" fullWidth={false} />}
        scrollable
        contentStyle={styles.content}
      >
      <View style={styles.stack}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Team</Text>
        </View>
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Total team</Text>
            <Text style={styles.statValue}>{teamCount} Employees</Text>
          </Card>
          <Card style={[styles.statCard, styles.statCardStatus]}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={styles.statValue}>{activeToday} Online Today</Text>
          </Card>
        </View>

        <View style={styles.list}>
          {analytics.leaderboard.map((item, index) => (
            <Card key={item.employee_id} style={[styles.memberCard, index >= 2 && styles.memberCardMuted]}>
              <View style={styles.memberRow}>
                <View style={[styles.avatar, avatarPalette[index % avatarPalette.length], index >= 2 && styles.avatarMuted]}>
                  <Text style={styles.avatarText}>{getInitials(item.fullname)}</Text>
                  <View style={styles.onlineDot} />
                </View>
                <View style={styles.memberCopy}>
                  <View style={styles.memberHeader}>
                    <Text style={[styles.memberName, index >= 2 && styles.memberNameMuted]}>{item.fullname}</Text>
                    <View style={styles.roleChip}>
                      <Text style={styles.roleText}>{getRoleLabel(index)}</Text>
                    </View>
                  </View>
                  <Text style={styles.memberMeta}>Sales this month: {formatCurrency(item.revenue)}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </Card>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function getRoleLabel(index: number): string {
  if (index === 0) {
    return 'Cashier';
  }
  if (index === 1) {
    return 'Inventory';
  }

  return index % 2 === 0 ? 'Cashier' : 'Inventory';
}

const avatarPalette = [
  { backgroundColor: '#D9D6FF' },
  { backgroundColor: '#F7D7D3' },
  { backgroundColor: '#E1E4E8' },
  { backgroundColor: '#D9D8F0' },
];

const styles = StyleSheet.create({
  content: {
    paddingBottom: dimensions.xl + 24,
  },
  stack: {
    gap: dimensions.lg,
  },
  pageHeader: {
    gap: dimensions.xs,
  },
  pageTitle: {
    ...typography.title,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: dimensions.sm,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    minHeight: 126,
    justifyContent: 'center',
    gap: dimensions.sm,
  },
  statCardStatus: {
    backgroundColor: '#F8FFF9',
  },
  statLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  statValue: {
    ...typography.subtitle,
    color: colors.text,
  },
  list: {
    gap: dimensions.md,
  },
  memberCard: {
    padding: dimensions.md,
  },
  memberCardMuted: {
    opacity: 0.82,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarMuted: {
    opacity: 0.85,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#58D39B',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  memberCopy: {
    flex: 1,
    minWidth: 0,
    gap: dimensions.xs,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
    flexWrap: 'wrap',
  },
  memberName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  memberNameMuted: {
    color: colors.textMuted,
  },
  roleChip: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: dimensions.sm,
    paddingVertical: 4,
    borderRadius: dimensions.radiusFull,
  },
  roleText: {
    ...typography.label,
    color: colors.text,
    textTransform: 'uppercase',
  },
  memberMeta: {
    ...typography.body,
    color: colors.textMuted,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 32,
    lineHeight: 32,
    marginTop: -2,
  },
});
