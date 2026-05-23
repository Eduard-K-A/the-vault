import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function Screen({ children, title, subtitle, action }: ScreenProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.screenHeader}>
        <View style={{ flex: 1 }}>
          {title ? <Text style={styles.screenTitle}>{title}</Text> : null}
          {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function Card({ children, style, padded = true }: CardProps) {
  return <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>;
}

interface BadgeProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'accent';
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.badge, badgeToneStyles[tone]]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        fullWidth && styles.buttonFullWidth,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
      ]}
      disabled={isDisabled}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#FFF' : colors.text} /> : <Text style={[styles.buttonText, buttonTextStyles[variant]]}>{label}</Text>}
    </Pressable>
  );
}

interface InputProps extends TextInputProps {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  return (
    <View style={styles.inputWrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput placeholderTextColor={colors.textMuted} style={[styles.input, style]} {...props} />
    </View>
  );
}

interface ModalSheetProps {
  visible: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function ModalSheet({ visible, title, children, onClose }: ModalSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.sheetHandle} />
          {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  tone?: 'primary' | 'accent' | 'success' | 'warning';
}

export function StatCard({ label, value, tone = 'primary' }: StatCardProps) {
  return (
    <Card style={[styles.statCard, statToneStyles[tone]]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: dimensions.lg,
    gap: dimensions.lg,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: dimensions.md,
  },
  screenTitle: {
    ...typography.title,
    color: colors.text,
  },
  screenSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: dimensions.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: dimensions.md,
    gap: dimensions.md,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: dimensions.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: dimensions.radiusLg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPadded: {
    padding: dimensions.md,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: dimensions.sm,
    paddingVertical: dimensions.xs,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  button: {
    minHeight: 48,
    borderRadius: dimensions.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: dimensions.lg,
  },
  buttonFullWidth: {
    alignSelf: 'stretch',
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '700',
  },
  inputWrapper: {
    gap: dimensions.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    borderRadius: dimensions.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: dimensions.md,
    ...typography.body,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
  },
  sheet: {
    borderTopLeftRadius: dimensions.radiusLg,
    borderTopRightRadius: dimensions.radiusLg,
    backgroundColor: colors.surface,
    padding: dimensions.lg,
    gap: dimensions.md,
    maxHeight: '86%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 56,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  sheetTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  statCard: {
    minWidth: 140,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statValue: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: dimensions.xs,
  },
});

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },
};

const buttonTextStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: '#FFFFFF' },
  secondary: { color: colors.text },
  ghost: { color: colors.primary },
  danger: { color: '#FFFFFF' },
};

const badgeToneStyles = StyleSheet.create({
  neutral: { backgroundColor: colors.surfaceMuted },
  success: { backgroundColor: '#DCFCE7' },
  warning: { backgroundColor: '#FEF3C7' },
  danger: { backgroundColor: '#FEE2E2' },
  primary: { backgroundColor: '#D7F5F3' },
  accent: { backgroundColor: '#FFEDD5' },
});

const statToneStyles = StyleSheet.create({
  primary: { borderColor: '#CDEDEA' },
  accent: { borderColor: '#FFD8B1' },
  success: { borderColor: '#BBF7D0' },
  warning: { borderColor: '#FDE68A' },
});
