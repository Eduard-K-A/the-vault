import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Screen } from '@/components/ui';
import { exportInventoryReport, exportSalesReport } from '@/services/export.service';
import { useBusinessStore } from '@/store/businessStore';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

type ExportKey = 'sales' | 'inventory' | null;

export default function ReportsScreen() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Navigation>();
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);
  const [pending, setPending] = useState<ExportKey>(null);

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  async function handleExportSales() {
    if (!business) {
      return;
    }

    try {
      setPending('sales');
      await exportSalesReport(business.id);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setPending(null);
    }
  }

  async function handleExportInventory() {
    if (!branch) {
      return;
    }

    try {
      setPending('inventory');
      await exportInventoryReport(branch.id);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setPending(null);
    }
  }

  return (
    <Screen title="Reports" subtitle="Export your data" onBack={handleBack} scrollable contentStyle={styles.content}>
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Workspace</Text>
            <Text style={styles.heroTitle} numberOfLines={1}>{business?.name ?? 'No business selected'}</Text>
            <Text style={styles.heroMeta} numberOfLines={1}>{branch?.name ?? 'No branch selected'}</Text>
          </View>
          <Badge label="Offline ready" tone="success" />
        </View>
      </Card>

      <ExportCard
        glyph="▤"
        title="Sales report"
        description="All transactions, payments, and refunds for this business as an Excel workbook."
        badgeLabel="Excel"
        badgeTone="accent"
        actionLabel="Export sales"
        onPress={handleExportSales}
        loading={pending === 'sales'}
        disabled={!business || pending !== null}
      />

      <ExportCard
        glyph="▦"
        title="Inventory report"
        description="Current stock levels and product details for the active branch."
        badgeLabel="Excel"
        badgeTone="accent"
        actionLabel="Export inventory"
        variant="secondary"
        onPress={handleExportInventory}
        loading={pending === 'inventory'}
        disabled={!branch || pending !== null}
      />

      <Card style={styles.soonCard}>
        <View style={styles.soonRow}>
          <Text style={styles.soonTitle}>CSV & PDF exports</Text>
          <Badge label="Coming soon" tone="warning" />
        </View>
        <Text style={styles.soonText}>
          Spreadsheet exports are powered by SheetJS and the native share sheet. CSV and PDF formats are on the way.
        </Text>
      </Card>
    </Screen>
  );
}

interface ExportCardProps {
  glyph: string;
  title: string;
  description: string;
  badgeLabel: string;
  badgeTone: 'accent' | 'success';
  actionLabel: string;
  variant?: 'primary' | 'secondary';
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
}

function ExportCard({
  glyph,
  title,
  description,
  badgeLabel,
  badgeTone,
  actionLabel,
  variant = 'primary',
  onPress,
  loading,
  disabled,
}: ExportCardProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Card style={styles.exportCard}>
      <View style={styles.exportHeader}>
        <View style={styles.exportBubble}>
          <Text style={styles.exportGlyph}>{glyph}</Text>
        </View>
        <View style={styles.exportCopy}>
          <View style={styles.exportTitleRow}>
            <Text style={styles.exportTitle}>{title}</Text>
            <Badge label={badgeLabel} tone={badgeTone} />
          </View>
          <Text style={styles.exportDescription}>{description}</Text>
        </View>
      </View>
      <Button label={actionLabel} variant={variant} onPress={onPress} loading={loading} disabled={disabled} />
    </Card>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    gap: dimensions.md,
    paddingBottom: dimensions.xl + 24,
  },
  heroCard: {
    backgroundColor: colors.accentSubtle,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    gap: dimensions.xxs,
  },
  heroLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  heroMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  exportCard: {
    gap: dimensions.md,
  },
  exportHeader: {
    flexDirection: 'row',
    gap: dimensions.sm,
    alignItems: 'flex-start',
  },
  exportBubble: {
    width: 44,
    height: 44,
    borderRadius: dimensions.radiusFull,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportGlyph: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  exportCopy: {
    flex: 1,
    minWidth: 0,
    gap: dimensions.xxs,
  },
  exportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  exportTitle: {
    ...typography.subtitle,
    color: colors.text,
    flexShrink: 1,
  },
  exportDescription: {
    ...typography.caption,
    color: colors.textMuted,
  },
  soonCard: {
    gap: dimensions.xs,
    backgroundColor: colors.surfaceMuted,
  },
  soonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: dimensions.sm,
  },
  soonTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  soonText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
