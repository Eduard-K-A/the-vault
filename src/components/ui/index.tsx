import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  onBack?: () => void | Promise<void>;
  backLabel?: string;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  title,
  subtitle,
  action,
  onBack,
  backLabel = 'Back',
  scrollable = false,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const showHeader = Boolean(title || onBack || action);
  const rightAction = action ?? (showHeader ? <View style={styles.headerSpacer} /> : null);

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + dimensions.screenPaddingV,
          paddingBottom: insets.bottom + dimensions.screenPaddingV,
        },
      ]}
    >
      <View pointerEvents="none" style={styles.decorLeft} />
      <View pointerEvents="none" style={styles.decorRight} />
      <View style={styles.shell}>
        {showHeader ? (
          <View style={styles.topBar}>
            {onBack ? (
              <Pressable
                accessibilityRole="button"
                onPress={onBack}
                style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              >
                <Text style={styles.iconText}>←</Text>
              </Pressable>
            ) : (
              <View style={styles.iconButton} />
            )}
            <View style={styles.titleWrap}>
              {title ? <Text style={styles.title}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <View style={styles.rightAction}>{rightAction}</View>
          </View>
        ) : null}
        {scrollable ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollBody, contentStyle]}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.body, contentStyle]}>{children}</View>
        )}
      </View>
    </View>
  );
}

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
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
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variantStyles[variant],
        fullWidth && styles.buttonFullWidth,
        !fullWidth && styles.buttonInline,
        pressed && !isDisabled && styles.buttonPressed,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.accent} />
      ) : (
        <Text style={[styles.buttonText, buttonTextStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

interface InputProps extends TextInputProps {
  label?: string;
}

export function Input({ label, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={styles.inputWrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, focused && styles.inputFocused, style]}
        {...props}
      />
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
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + dimensions.screenPaddingV }]}
          onPress={(event) => event.stopPropagation()}
        >
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
      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.sectionAction}>{action}</View> : null}
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  tone?: 'primary' | 'accent' | 'success' | 'warning';
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}

export function StatCard({ label, value, tone = 'primary', style, compact = false }: StatCardProps) {
  return (
    <Card style={[styles.statCard, compact && styles.statCardCompact, statToneStyles[tone], style]}>
      <Text style={[styles.statLabel, compact && styles.statLabelCompact]}>{label}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={compact}
        minimumFontScale={0.78}
        style={[styles.statValue, compact && styles.statValueCompact]}
      >
        {value}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: dimensions.screenPaddingH,
    overflow: 'hidden',
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: dimensions.lg,
  },
  topBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
    paddingBottom: dimensions.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  rightAction: {
    minWidth: 38,
    alignItems: 'flex-end',
  },
  headerSpacer: {
    width: 38,
    height: 38,
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: dimensions.lg,
  },
  scrollBody: {
    flexGrow: 1,
    gap: dimensions.lg,
    paddingBottom: dimensions.screenPaddingV,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: dimensions.md,
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionAction: {
    alignItems: 'flex-end',
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
    borderRadius: dimensions.radiusXl,
    borderWidth: dimensions.cardBorderWidth,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    overflow: 'hidden',
  },
  cardPadded: {
    padding: dimensions.md + 2,
  },
  badge: {
    borderRadius: dimensions.radiusFull,
    paddingHorizontal: dimensions.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.label,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  button: {
    minHeight: dimensions.buttonHeight,
    borderRadius: dimensions.radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: dimensions.lg,
    flexDirection: 'row',
    gap: dimensions.xs,
  },
  buttonFullWidth: {
    alignSelf: 'stretch',
  },
  buttonInline: {
    alignSelf: 'flex-start',
  },
  buttonPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    ...typography.body,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  inputWrapper: {
    gap: dimensions.xs,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    minHeight: dimensions.buttonHeight,
    borderRadius: dimensions.radiusLg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
    paddingHorizontal: dimensions.md,
    ...typography.body,
  },
  inputFocused: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },
  sheet: {
    borderTopLeftRadius: dimensions.radiusXl,
    borderTopRightRadius: dimensions.radiusXl,
    backgroundColor: colors.surface,
    paddingHorizontal: dimensions.screenPaddingH,
    paddingTop: dimensions.md,
    gap: dimensions.md,
    maxHeight: '86%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: dimensions.sheetHandleWidth,
    height: dimensions.sheetHandleHeight,
    borderRadius: dimensions.radiusFull,
    backgroundColor: colors.borderStrong,
    marginBottom: dimensions.xs,
  },
  sheetTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: dimensions.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    opacity: 0.9,
  },
  iconText: {
    ...typography.subtitle,
    color: colors.text,
    lineHeight: 20,
  },
  statCard: {
    minWidth: 140,
  },
  statCardCompact: {
    minWidth: 0,
    padding: dimensions.sm + 2,
    gap: dimensions.xs,
    alignItems: 'center',
  },
  statLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statLabelCompact: {
    fontSize: 10,
    lineHeight: 14,
  },
  statValue: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: dimensions.xs,
  },
  statValueCompact: {
    fontSize: 17,
    lineHeight: 22,
    marginTop: 0,
    textAlign: 'center',
  },
  decorLeft: {
    position: 'absolute',
    top: -80,
    left: -90,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(75, 65, 225, 0.04)',
  },
  decorRight: {
    position: 'absolute',
    top: 110,
    right: -110,
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: 'rgba(0, 0, 11, 0.03)',
  },
});

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
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
  secondary: { color: colors.accent },
  ghost: { color: colors.text },
  danger: { color: '#FFFFFF' },
};

const badgeToneStyles = StyleSheet.create({
  neutral: { backgroundColor: colors.surfaceMuted },
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.warningSoft },
  danger: { backgroundColor: colors.dangerSoft },
  primary: { backgroundColor: '#E2E0FC' },
  accent: { backgroundColor: '#E2DFFF' },
});

const statToneStyles = StyleSheet.create({
  primary: { borderColor: '#C6C4DF' },
  accent: { borderColor: '#C3C0FF' },
  success: { borderColor: '#BEEAD3' },
  warning: { borderColor: '#F7D77A' },
});
