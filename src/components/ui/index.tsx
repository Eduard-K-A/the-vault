import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  sync?: React.ReactNode;
  action?: React.ReactNode;
}

export function AppHeader({ title, subtitle, sync, action }: AppHeaderProps) {
  return (
    <View style={styles.appHeader}>
      <View style={styles.appHeaderCopy}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <View style={styles.appHeaderActions}>
        {sync}
        {action}
      </View>
    </View>
  );
}

interface IconButtonProps {
  label: string;
  icon: string;
  onPress?: () => void;
  disabled?: boolean;
}

export function IconButton({ label, icon, onPress, disabled = false }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconActionButton, pressed && !disabled && styles.iconButtonPressed, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.iconActionText}>{icon}</Text>
    </Pressable>
  );
}

interface SegmentedControlOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  accessibilityLabel: string;
  value: string;
  options: SegmentedControlOption[];
  onChange: (value: string) => void;
}

export function SegmentedControl({ accessibilityLabel, value, options, onChange }: SegmentedControlProps) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.segmentedControl}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface PlaceholderActionProps {
  label: string;
  message: string;
  onUnavailable?: (message: string) => void;
}

export function PlaceholderAction({ label, message, onUnavailable }: PlaceholderActionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onUnavailable?.(message)}
      style={({ pressed }) => [styles.placeholderAction, pressed && styles.buttonPressed]}
    >
      <Text style={styles.placeholderActionLabel}>{label}</Text>
    </Pressable>
  );
}

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
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';
  const keyboardVerticalOffset = insets.top + dimensions.screenPaddingV;

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
      <KeyboardAvoidingView
        behavior={keyboardBehavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
        style={styles.keyboardAvoiding}
        testID="screen-keyboard-avoiding-view"
      >
        <View style={styles.shell}>
          {showHeader ? (
            <View style={styles.topBar}>
              {onBack ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={backLabel}
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
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.body, contentStyle]}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
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
  accessibilityLabel?: string;
  testID?: string;
}

export function Badge({ label, tone = 'neutral', accessibilityLabel, testID }: BadgeProps) {
  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel ?? label} style={[styles.badge, badgeToneStyles[tone]]}>
      <Text style={[styles.badgeText, badgeTextToneStyles[tone]]}>{label}</Text>
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
  accessibilityLabel?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
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
        <ActivityIndicator color={variant === 'primary' ? colors.chipActiveText : variant === 'danger' ? colors.danger : colors.accent} />
      ) : (
        <Text style={[styles.buttonText, buttonTextStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

interface InputProps extends TextInputProps {
  label?: string;
  accessibilityLabel?: string;
}

export function Input({ label, style, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={styles.inputWrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={props.accessibilityLabel ?? label}
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
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={keyboardBehavior}
          keyboardVerticalOffset={insets.top}
          style={styles.sheetKeyboardAvoiding}
          testID="modal-sheet-keyboard-avoiding-view"
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + dimensions.screenPaddingV }]}
            accessibilityLabel={title ? `${title} sheet` : 'Modal sheet'}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
            {children}
          </Pressable>
        </KeyboardAvoidingView>
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
  appHeader: {
    minHeight: dimensions.headerHeight,
    paddingHorizontal: dimensions.screenPaddingH,
    backgroundColor: colors.surface,
    borderBottomWidth: dimensions.cardBorderWidth,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
  },
  appHeaderCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  appHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.xs,
  },
  iconActionButton: {
    width: dimensions.touchTarget,
    height: dimensions.touchTarget,
    borderRadius: dimensions.radiusFull,
    borderWidth: dimensions.cardBorderWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionText: {
    ...typography.subtitle,
    color: colors.textSecondary,
  },
  segmentedControl: {
    minHeight: dimensions.touchTarget,
    borderRadius: dimensions.radiusMd,
    borderWidth: dimensions.cardBorderWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: dimensions.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: dimensions.sm,
  },
  segmentActive: {
    backgroundColor: colors.chipActiveBg,
  },
  segmentLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  segmentLabelActive: {
    color: colors.chipActiveText,
  },
  placeholderAction: {
    minHeight: dimensions.touchTarget,
    opacity: 0.5,
    borderRadius: dimensions.radiusLg,
    borderWidth: dimensions.cardBorderWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: dimensions.md,
  },
  placeholderActionLabel: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  keyboardAvoiding: {
    flex: 1,
    width: '100%',
  },
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: 0,
  },
  topBar: {
    minHeight: dimensions.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.sm,
    paddingHorizontal: dimensions.screenPaddingH,
    backgroundColor: colors.surface,
    borderBottomWidth: dimensions.cardBorderWidth,
    borderBottomColor: colors.border,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  rightAction: {
    minWidth: dimensions.touchTarget,
    alignItems: 'flex-end',
  },
  headerSpacer: {
    width: dimensions.touchTarget,
    height: dimensions.touchTarget,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.text,
    textAlign: 'left',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'left',
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: dimensions.sectionGap,
    paddingHorizontal: dimensions.screenPaddingH,
    paddingTop: dimensions.screenPaddingV,
  },
  scrollBody: {
    flexGrow: 1,
    gap: dimensions.sectionGap,
    paddingHorizontal: dimensions.screenPaddingH,
    paddingTop: dimensions.screenPaddingV,
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
    padding: dimensions.cardPadding,
  },
  badge: {
    borderRadius: dimensions.radiusFull,
    paddingHorizontal: dimensions.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    ...typography.label,
    textTransform: 'uppercase',
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
    minHeight: dimensions.inputHeight,
    borderRadius: dimensions.radiusLg,
    borderWidth: dimensions.cardBorderWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: dimensions.md,
    ...typography.body,
  },
  inputFocused: {
    borderColor: colors.accent,
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
    paddingTop: dimensions.xs,
    gap: dimensions.md,
    maxHeight: '86%',
  },
  sheetKeyboardAvoiding: {
    width: '100%',
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
    width: dimensions.touchTarget,
    height: dimensions.touchTarget,
    borderRadius: dimensions.radiusFull,
    borderWidth: dimensions.cardBorderWidth,
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
    borderWidth: dimensions.cardBorderWidth,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.surface,
    borderWidth: dimensions.cardBorderWidth,
    borderColor: colors.danger,
  },
};

const buttonTextStyles: Record<ButtonVariant, TextStyle> = {
  primary: { color: colors.chipActiveText },
  secondary: { color: colors.text },
  ghost: { color: colors.text },
  danger: { color: colors.danger },
};

const badgeToneStyles = StyleSheet.create({
  neutral: { backgroundColor: colors.surfaceMuted },
  success: { backgroundColor: colors.successSoft },
  warning: { backgroundColor: colors.warningSoft },
  danger: { backgroundColor: colors.dangerSoft },
  primary: { backgroundColor: colors.accentSubtle },
  accent: { backgroundColor: colors.accentSubtle },
});

const badgeTextToneStyles = StyleSheet.create({
  neutral: { color: colors.textSecondary },
  success: { color: colors.success },
  warning: { color: colors.warning },
  danger: { color: colors.danger },
  primary: { color: colors.accent },
  accent: { color: colors.accent },
});

const statToneStyles = StyleSheet.create({
  primary: { borderColor: colors.border },
  accent: { borderColor: colors.accentSubtle },
  success: { borderColor: colors.successBg },
  warning: { borderColor: colors.warningBg },
});
