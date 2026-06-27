import React from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { dimensions, elevation } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

/** Small status pill used inside list rows. Mirrors Badge tones without a cross-import. */
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const { styles, pillTone, pillTextTone } = useThemedStyles(createStyles);
  return (
    <View style={[styles.pill, pillTone[tone]]}>
      <Text style={[styles.pillText, pillTextTone[tone]]}>{label}</Text>
    </View>
  );
}

interface ToastProps {
  message: string | null;
  visible: boolean;
}

/** Presentational, animated toast. Caller owns visibility + auto-dismiss timing. */
export function Toast({ message, visible }: ToastProps) {
  const { styles } = useThemedStyles(createStyles);
  const [progress] = React.useState(() => new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 180 : 160,
      useNativeDriver: true,
    }).start();
  }, [progress, visible]);

  if (!message && !visible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Neutral loading block with a subtle opacity pulse (no shimmer dependency). */
export function Skeleton({ width = '100%', height = 16, radius = dimensions.radiusMd, style }: SkeletonProps) {
  const colors = useTheme();
  const [pulse] = React.useState(() => new Animated.Value(0.5));

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceMuted, opacity: pulse }, style]}
    />
  );
}

/** Product-grid skeleton placeholder, matching ProductCard footprint. */
export function SkeletonCard() {
  const { styles } = useThemedStyles(createStyles);
  return (
    <View style={styles.skeletonCard}>
      <Skeleton height={132} radius={0} />
      <View style={styles.skeletonBody}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="45%" height={12} />
        <Skeleton width="60%" height={16} />
      </View>
    </View>
  );
}

interface StepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  incrementLabel: string;
  decrementLabel: string;
}

export function Stepper({ value, onIncrement, onDecrement, incrementLabel, decrementLabel }: StepperProps) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        onPress={onDecrement}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
      >
        <Text style={styles.stepperGlyph}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        onPress={onIncrement}
        style={({ pressed }) => [styles.stepperButton, pressed && styles.pressed]}
      >
        <Text style={styles.stepperGlyph}>+</Text>
      </Pressable>
    </View>
  );
}

interface PaymentChipProps {
  label: string;
  glyph: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}

export function PaymentChip({ label, glyph, active, onPress, accessibilityLabel }: PaymentChipProps) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.paymentChip,
        active && styles.paymentChipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.paymentChipGlyph, active && styles.paymentChipTextActive]}>{glyph}</Text>
      <Text style={[styles.paymentChipLabel, active && styles.paymentChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

interface RowShellProps {
  onPress?: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Shared 64dp tappable row shell with consistent padding, divider, and selected accent. */
function RowShell({ onPress, onLongPress, selected, disabled, accessibilityLabel, children, style }: RowShellProps) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || (!onPress && !onLongPress)}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        disabled && styles.rowDisabled,
        pressed && onPress && !disabled && styles.rowPressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

function Avatar({ text, glyph, tone = 'neutral' }: { text?: string; glyph?: string; tone?: 'neutral' | 'accent' }) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <View style={[styles.avatar, tone === 'accent' && styles.avatarAccent]}>
      <Text style={[styles.avatarText, tone === 'accent' && styles.avatarTextAccent]}>
        {glyph ?? (text ? text.slice(0, 2).toUpperCase() : '?')}
      </Text>
    </View>
  );
}

interface SalesRowProps {
  orderId: string;
  dateLabel: string;
  amount: string;
  statusLabel: string;
  statusTone?: StatusTone;
  methodGlyph?: string;
  onPress?: () => void;
}

export function SalesRow({ orderId, dateLabel, amount, statusLabel, statusTone = 'neutral', methodGlyph, onPress }: SalesRowProps) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <RowShell onPress={onPress} accessibilityLabel={`Sale ${orderId}`}>
      <Avatar glyph={methodGlyph ?? '▭'} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowMono} numberOfLines={1}>{orderId}</Text>
        <Text style={styles.rowCaption} numberOfLines={1}>{dateLabel}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount}>{amount}</Text>
        <StatusPill label={statusLabel} tone={statusTone} />
      </View>
    </RowShell>
  );
}

interface BusinessRowProps {
  name: string;
  meta: string;
  badgeLabel?: string;
  badgeTone?: StatusTone;
  selected?: boolean;
  onPress?: () => void;
}

export function BusinessRow({ name, meta, badgeLabel, badgeTone = 'neutral', selected, onPress }: BusinessRowProps) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <RowShell onPress={onPress} selected={selected} accessibilityLabel={name}>
      <Avatar text={name} tone={badgeTone === 'accent' ? 'accent' : 'neutral'} />
      <View style={styles.rowCopy}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
          {badgeLabel ? <StatusPill label={badgeLabel} tone={badgeTone} /> : null}
        </View>
        <Text style={styles.rowCaption} numberOfLines={1}>{meta}</Text>
      </View>
      {onPress ? <Text style={styles.chevron}>›</Text> : null}
    </RowShell>
  );
}

interface EmployeeRowProps {
  name: string;
  meta: string;
  roleLabel?: string;
  roleTone?: StatusTone;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function EmployeeRow({ name, meta, roleLabel, roleTone = 'neutral', onPress, onLongPress }: EmployeeRowProps) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <RowShell onPress={onPress} onLongPress={onLongPress} accessibilityLabel={name}>
      <Avatar text={name} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>{name}</Text>
        <Text style={styles.rowCaption} numberOfLines={1}>{meta}</Text>
      </View>
      <View style={styles.rowRight}>
        {roleLabel ? <StatusPill label={roleLabel} tone={roleTone} /> : null}
        {onPress ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </RowShell>
  );
}

interface SettingsRowProps {
  title: string;
  caption?: string;
  glyph?: string;
  value?: string;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function SettingsRow({ title, caption, glyph, value, tone = 'default', disabled, onPress, accessibilityLabel }: SettingsRowProps) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <RowShell onPress={onPress} disabled={disabled} accessibilityLabel={accessibilityLabel ?? title}>
      {glyph ? (
        <View style={[styles.settingsBubble, tone === 'danger' && styles.settingsBubbleDanger]}>
          <Text style={[styles.settingsGlyph, tone === 'danger' && styles.settingsGlyphDanger]}>{glyph}</Text>
        </View>
      ) : null}
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, tone === 'danger' && styles.dangerText]} numberOfLines={1}>{title}</Text>
        {caption ? <Text style={styles.rowCaption} numberOfLines={2}>{caption}</Text> : null}
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {onPress && !disabled ? <Text style={styles.chevron}>›</Text> : null}
      </View>
    </RowShell>
  );
}

/** Grouped list container: surface card with hairline dividers between rows. */
export function RowGroup({ children, label }: { children: React.ReactNode; label?: string }) {
  const { styles } = useThemedStyles(createStyles);
  const items = React.Children.toArray(children);
  return (
    <View style={styles.groupWrap}>
      {label ? <Text style={styles.groupLabel}>{label}</Text> : null}
      <View style={styles.group}>
        {items.map((child, index) => (
          <View key={index} style={index !== items.length - 1 ? styles.groupDivider : undefined}>
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (c: ThemeColors) => {
  const styles = StyleSheet.create({
    pill: {
      borderRadius: dimensions.radiusFull,
      paddingHorizontal: dimensions.sm,
      paddingVertical: 4,
      alignSelf: 'flex-start',
    },
    pillText: {
      ...typography.label,
      textTransform: 'uppercase',
    },
    toast: {
      position: 'absolute',
      left: dimensions.screenPaddingH,
      right: dimensions.screenPaddingH,
      bottom: dimensions.tabBarHeight + dimensions.md,
      paddingHorizontal: dimensions.md,
      paddingVertical: dimensions.sm,
      borderRadius: dimensions.radiusLg,
      backgroundColor: c.surface,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.border,
      shadowColor: c.shadow,
      ...elevation.raised,
    },
    toastText: {
      ...typography.bodyMedium,
      color: c.textPrimary,
      textAlign: 'center',
    },
    skeletonCard: {
      flex: 1,
      minHeight: 220,
      borderRadius: dimensions.radiusXl,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: 'hidden',
    },
    skeletonBody: {
      padding: dimensions.sm,
      gap: dimensions.xs,
    },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: dimensions.xs,
      backgroundColor: c.surfaceMuted,
      borderRadius: dimensions.radiusFull,
      paddingHorizontal: dimensions.xs,
      paddingVertical: 4,
    },
    stepperButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperGlyph: {
      ...typography.subtitle,
      color: c.textPrimary,
      lineHeight: 20,
    },
    stepperValue: {
      ...typography.bodyMedium,
      color: c.textPrimary,
      minWidth: 24,
      textAlign: 'center',
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    paymentChip: {
      flex: 1,
      minWidth: '22%',
      minHeight: 76,
      borderRadius: dimensions.radiusLg,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: dimensions.xs,
      paddingHorizontal: dimensions.xs,
    },
    paymentChipActive: {
      borderColor: c.accent,
      backgroundColor: c.accent,
      shadowColor: c.shadow,
      ...elevation.raised,
    },
    paymentChipGlyph: {
      ...typography.subtitle,
      color: c.accent,
    },
    paymentChipLabel: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '600',
    },
    paymentChipTextActive: {
      color: c.onAccent,
    },
    row: {
      minHeight: dimensions.rowHeight,
      flexDirection: 'row',
      alignItems: 'center',
      gap: dimensions.sm,
      paddingHorizontal: dimensions.md,
      paddingVertical: dimensions.sm,
      backgroundColor: c.surface,
    },
    rowSelected: {
      borderLeftWidth: 2,
      borderLeftColor: c.accent,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    rowPressed: {
      backgroundColor: c.surfaceMuted,
    },
    rowCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    rowTitleLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: dimensions.xs,
      minWidth: 0,
    },
    rowTitle: {
      ...typography.bodyMedium,
      color: c.textPrimary,
      flexShrink: 1,
    },
    rowMono: {
      ...typography.mono,
      color: c.textPrimary,
      fontWeight: '600',
    },
    rowCaption: {
      ...typography.caption,
      color: c.textSecondary,
    },
    rowRight: {
      alignItems: 'flex-end',
      gap: 4,
    },
    rowAmount: {
      ...typography.price,
      color: c.textPrimary,
      fontVariant: ['tabular-nums'],
    },
    rowValue: {
      ...typography.body,
      color: c.textSecondary,
    },
    chevron: {
      ...typography.subtitle,
      color: c.textSecondary,
      paddingLeft: dimensions.xs,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: dimensions.radiusFull,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarAccent: {
      backgroundColor: c.accentSubtle,
    },
    avatarText: {
      ...typography.bodyMedium,
      color: c.textSecondary,
      fontWeight: '700',
    },
    avatarTextAccent: {
      color: c.accent,
    },
    settingsBubble: {
      width: 40,
      height: 40,
      borderRadius: dimensions.radiusFull,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingsBubbleDanger: {
      backgroundColor: c.dangerBg,
    },
    settingsGlyph: {
      ...typography.subtitle,
      color: c.textSecondary,
    },
    settingsGlyphDanger: {
      color: c.danger,
    },
    dangerText: {
      color: c.danger,
    },
    groupWrap: {
      gap: dimensions.xs,
    },
    groupLabel: {
      ...typography.label,
      color: c.textSecondary,
      textTransform: 'uppercase',
      marginLeft: dimensions.xs,
    },
    group: {
      backgroundColor: c.surface,
      borderRadius: dimensions.radiusXl,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.border,
      overflow: 'hidden',
    },
    groupDivider: {
      borderBottomWidth: dimensions.cardBorderWidth,
      borderBottomColor: c.border,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
  });

  const pillTone = StyleSheet.create({
    neutral: { backgroundColor: c.surfaceMuted },
    success: { backgroundColor: c.successBg },
    warning: { backgroundColor: c.warningBg },
    danger: { backgroundColor: c.dangerBg },
    accent: { backgroundColor: c.accentSubtle },
  });

  const pillTextTone = StyleSheet.create({
    neutral: { color: c.textSecondary },
    success: { color: c.success },
    warning: { color: c.warning },
    danger: { color: c.danger },
    accent: { color: c.accent },
  });

  return { styles, pillTone, pillTextTone };
};
