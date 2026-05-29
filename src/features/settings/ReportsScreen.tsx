import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Screen } from '@/components/ui';
import { exportInventoryReport, exportSalesReport } from '@/services/export.service';
import { useBusinessStore } from '@/store/businessStore';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function ReportsScreen() {
  const navigation = useNavigation<Navigation>();
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);
  const [loading, setLoading] = useState(false);

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
    <Screen title="POSly" onBack={handleBack} scrollable contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>Export business data to Excel.</Text>
      </View>
      <Card style={styles.card}>
        <Text style={styles.helper}>Exports use SheetJS and the native share sheet.</Text>
        <Button label="Export sales" onPress={handleExportSales} loading={loading} />
        <Button label="Export inventory" variant="secondary" onPress={handleExportInventory} loading={loading} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: dimensions.xl + 24,
  },
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
    gap: dimensions.md,
  },
  helper: {
    ...typography.body,
    color: colors.textMuted,
  },
});
