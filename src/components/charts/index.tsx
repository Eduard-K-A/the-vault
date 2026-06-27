import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ThemeColors } from '@/constants/colors';
import { dimensions, elevation } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { useTheme, useThemedStyles } from '@/theme';

interface BarDatum {
  label: string;
  value: number;
  color?: string;
}

export function BarChart({ data }: { data: BarDatum[] }) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const max = Math.max(...data.map((item) => item.value), 1);
  const isEmpty = data.length === 0 || data.every((item) => item.value === 0);

  if (isEmpty) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.emptyCaption}>No sales in this period</Text>
      </View>
    );
  }

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

const LINE_PLOT_HEIGHT = 120;

export function LineChart({ data }: LineChartProps) {
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = React.useState(0);
  const max = Math.max(...data.map((item) => item.value), 1);
  const isEmpty = data.length === 0 || data.every((item) => item.value === 0);

  if (isEmpty) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.emptyCaption}>No sales in this period</Text>
      </View>
    );
  }

  const points = data.map((item, index) => ({
    ...item,
    x: data.length > 1 ? (index / (data.length - 1)) * width : width / 2,
    y: LINE_PLOT_HEIGHT - (item.value / max) * LINE_PLOT_HEIGHT,
  }));

  return (
    <View style={styles.chartCard}>
      <View style={styles.linePlot} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0
          ? points.map((point, index) => {
              const next = points[index + 1];
              const connector = next
                ? (() => {
                    const dx = next.x - point.x;
                    const dy = next.y - point.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx);
                    return (
                      <View
                        key={`seg-${index}`}
                        style={[
                          styles.lineSegment,
                          {
                            width: length,
                            left: (point.x + next.x) / 2 - length / 2,
                            top: (point.y + next.y) / 2,
                            transform: [{ rotate: `${angle}rad` }],
                          },
                        ]}
                      />
                    );
                  })()
                : null;

              return (
                <React.Fragment key={point.label}>
                  {connector}
                  <View style={[styles.lineDot, { left: point.x - 5, top: point.y - 5 }]} />
                </React.Fragment>
              );
            })
          : null}
      </View>
      <View style={styles.lineLabels}>
        {data.map((item) => (
          <Text key={item.label} style={styles.lineLabel} numberOfLines={1}>
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

interface DonutChartProps {
  data: BarDatum[];
}

export function DonutChart({ data }: DonutChartProps) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const rawTotal = data.reduce((sum, item) => sum + item.value, 0);
  const total = rawTotal || 1;

  if (data.length === 0 || rawTotal === 0) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.emptyCaption}>No sales in this period</Text>
      </View>
    );
  }

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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: dimensions.cardBorderWidth,
    borderRadius: dimensions.radiusLg,
    padding: dimensions.md,
    gap: dimensions.md,
    shadowColor: colors.shadow,
    ...elevation.resting,
  },
  emptyCaption: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: dimensions.lg,
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
  linePlot: {
    height: LINE_PLOT_HEIGHT,
    position: 'relative',
  },
  lineSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.accent,
  },
  lineDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: dimensions.radiusFull,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lineLabel: {
    ...typography.caption,
    color: colors.textMuted,
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
