import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';

interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export function BarChart({ data }: { data: BarDatum[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <View style={styles.chartCard}>
      {data.map((item) => (
        <View key={item.label} style={styles.barRow}>
          <Text style={styles.barLabel} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(4, (item.value / max) * 100)}%`,
                  backgroundColor: item.color ?? colors.accent,
                },
              ]}
            />
          </View>
          <Text style={styles.barValue}>{item.value.toFixed(0)}</Text>
        </View>
      ))}
    </View>
  );
}

interface LineChartProps {
  data: BarDatum[];
}

export function LineChart({ data }: LineChartProps) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.linePlaceholder}>
        {data.map((item) => (
          <View key={item.label} style={styles.linePoint}>
            <View style={[styles.lineDot, { backgroundColor: item.color ?? colors.accent }]} />
            <Text style={styles.lineLabel}>{item.label}</Text>
            <Text style={styles.lineValue}>{item.value.toFixed(0)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

interface DonutChartProps {
  data: BarDatum[];
}

export function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <View style={styles.chartCard}>
      <View style={styles.donutBody}>
        <Text style={styles.donutTitle}>{Math.round(total)}</Text>
        <Text style={styles.donutSubtitle}>Total</Text>
      </View>
      <View style={styles.legend}>
        {data.map((item) => (
          <View key={item.label} style={styles.legendRow}>
            <View style={[styles.legendSwatch, { backgroundColor: item.color ?? colors.accent }]} />
            <Text style={styles.legendLabel} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={styles.legendValue}>{Math.round((item.value / total) * 100)}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: dimensions.cardBorderWidth,
    borderRadius: dimensions.radiusLg,
    padding: dimensions.md,
    gap: dimensions.md,
    shadowColor: colors.primary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textMuted,
    width: 92,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceMuted,
    borderRadius: dimensions.radiusFull,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: dimensions.radiusFull,
  },
  barValue: {
    ...typography.caption,
    color: colors.text,
    width: 44,
    textAlign: 'right',
    fontWeight: '700',
  },
  linePlaceholder: {
    gap: dimensions.sm,
  },
  linePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  lineDot: {
    width: 10,
    height: 10,
    borderRadius: dimensions.radiusFull,
  },
  lineLabel: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  lineValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  donutBody: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: dimensions.xl,
    borderRadius: dimensions.radiusLg,
    backgroundColor: colors.surfaceMuted,
  },
  donutTitle: {
    ...typography.title,
    color: colors.text,
  },
  donutSubtitle: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: dimensions.xs,
    textTransform: 'uppercase',
  },
  legend: {
    gap: dimensions.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: dimensions.radiusFull,
  },
  legendLabel: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  legendValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
});
