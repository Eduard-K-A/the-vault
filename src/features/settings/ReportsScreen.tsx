import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { exportInventoryReport, exportSalesReport } from '@/services/export.service';
import { useBusinessStore } from '@/store/businessStore';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';

export default function ReportsScreen() {
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);
  const [loading, setLoading] = useState(false);

  async function handleExportSales() {
    if (!business) {
      return;
    }

    try {
      setLoading(true);
      await exportSalesReport(business.id);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportInventory() {
    if (!branch) {
      return;
    }

    try {
      setLoading(true);
      await exportInventoryReport(branch.id);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Reports" subtitle="Export business data to Excel.">
      <Card style={styles.card}>
        <Text style={styles.helper}>Exports use SheetJS and the native share sheet.</Text>
        <Button label="Export sales" onPress={handleExportSales} loading={loading} />
        <Button label="Export inventory" variant="secondary" onPress={handleExportInventory} loading={loading} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: dimensions.md,
  },
  helper: {
    color: colors.textMuted,
  },
});

