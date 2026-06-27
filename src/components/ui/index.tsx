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

import { dimensions, elevation } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';

export * from './premium';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  sync?: React.ReactNode;
  action?: React.ReactNode;
}

export function AppHeader({ title, subtitle, sync, action }: AppHeaderProps) {
  const { styles } = useThemedStyles(createStyles);
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
  const { styles } = useThemedStyles(createStyles);
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
  const { styles } = useThemedStyles(createStyles);
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
  const { styles } = useThemedStyles(createStyles);
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
  const { styles } = useThemedStyles(createStyles);
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
              ) : null}
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
  const { styles } = useThemedStyles(createStyles);
  return <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>;
}

interface BadgeProps {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary' | 'accent';
  accessibilityLabel?: string;
  testID?: string;
}

export function Badge({ label, tone = 'neutral', accessibilityLabel, testID }: BadgeProps) {
  const { styles, badgeTone, badgeTextTone } = useThemedStyles(createStyles);
  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel ?? label} style={[styles.badge, badgeTone[tone]]}>
      <Text style={[styles.badgeText, badgeTextTone[tone]]}>{label}</Text>
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
  const colors = useTheme();
  const { styles, variantStyles, buttonTextStyles } = useThemedStyles(createStyles);
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
        <ActivityIndicator color={variant === 'primary' ? colors.onAccent : variant === 'danger' ? colors.danger : colors.accent} />
      ) : (
        <Text style={[styles.buttonText, buttonTextStyles[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

interface InputProps extends TextInputProps {
  label?: string;
  accessibilityLabel?: string;
  error?: string | null;
}

export function Input({ label, style, onFocus, onBlur, error, ...props }: InputProps) {
  const colors = useTheme();
  const { styles } = useThemedStyles(createStyles);
  const [focused, setFocused] = React.useState(false);
  const hasError = Boolean(error);

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
        style={[
          styles.input,
          focused && styles.inputFocused,
          hasError && styles.inputError,
          style,
        ]}
        {...props}
      />
      {hasError ? <Text style={styles.inputErrorText}>{error}</Text> : null}
    </View>
  );
}

interface ModalSheetProps {
  visible: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}

export function ModalSheet({ visible, title, children, onClose, footer }: ModalSheetProps) {
  const { styles } = useThemedStyles(createStyles);
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
            {title ? (
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{title}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={8}
                  onPress={onClose}
                  style={({ pressed }) => [styles.sheetClose, pressed && styles.iconButtonPressed]}
                >
                  <Text style={styles.sheetCloseGlyph}>✕</Text>
                </Pressable>
              </View>
            ) : null}
            {children}
            {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

interface ComingSoonSheetProps {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
}

/** Standard bottom sheet for disabled future controls. */
export function ComingSoonSheet({ visible, title = 'Coming soon', message, onClose }: ComingSoonSheetProps) {
  const { styles } = useThemedStyles(createStyles);
  return (
    <ModalSheet visible={visible} title={title} onClose={onClose}>
      <View style={styles.comingSoonBody}>
        <Text style={styles.comingSoonText}>{message}</Text>
        <Button label="Got it" onPress={onClose} />
      </View>
    </ModalSheet>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  const { styles } = useThemedStyles(createStyles);
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
  const { styles, statTone } = useThemedStyles(createStyles);
  return (
    <Card style={[styles.statCard, compact && styles.statCardCompact, statTone[tone], style]}>
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

const createStyles = (c: ThemeColors) => {
  const styles = StyleSheet.create({
    appHeader: {
      minHeight: dimensions.headerHeight,
      paddingHorizontal: dimensions.screenPaddingH,
      backgroundColor: c.surface,
      borderBottomWidth: dimensions.cardBorderWidth,
      borderBottomColor: c.border,
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
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconActionText: {
      ...typography.subtitle,
      color: c.textSecondary,
    },
    segmentedControl: {
      minHeight: dimensions.touchTarget,
      borderRadius: dimensions.radiusMd,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
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
      backgroundColor: c.chipActiveBg,
    },
    segmentLabel: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '500',
    },
    segmentLabelActive: {
      color: c.chipActiveText,
    },
    placeholderAction: {
      minHeight: dimensions.touchTarget,
      opacity: 0.5,
      borderRadius: dimensions.radiusLg,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: dimensions.md,
    },
    placeholderActionLabel: {
      ...typography.bodyMedium,
      color: c.text,
    },
    screen: {
      flex: 1,
      backgroundColor: c.background,
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
      backgroundColor: c.background,
      borderBottomWidth: dimensions.cardBorderWidth,
      borderBottomColor: c.border,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-start',
    },
    rightAction: {
      minWidth: dimensions.touchTarget,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    headerSpacer: {
      width: dimensions.touchTarget,
      height: dimensions.touchTarget,
    },
    title: {
      ...typography.bodyMedium,
      color: c.text,
      textAlign: 'left',
    },
    subtitle: {
      ...typography.caption,
      color: c.textMuted,
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
      color: c.text,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: dimensions.xs,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: dimensions.radiusXl,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.border,
      shadowColor: c.shadow,
      ...elevation.resting,
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
      color: c.textMuted,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: dimensions.inputHeight,
      borderRadius: dimensions.radiusLg,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      color: c.text,
      paddingHorizontal: dimensions.md,
      ...typography.body,
    },
    inputFocused: {
      borderColor: c.accent,
      borderWidth: 1.5,
    },
    inputError: {
      borderColor: c.danger,
      borderWidth: 1.5,
    },
    inputErrorText: {
      ...typography.caption,
      color: c.danger,
    },
    sheetOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: c.scrim,
    },
    sheet: {
      borderTopLeftRadius: dimensions.radius2xl,
      borderTopRightRadius: dimensions.radius2xl,
      backgroundColor: c.surface,
      paddingHorizontal: dimensions.screenPaddingH,
      paddingTop: dimensions.xs,
      gap: dimensions.md,
      maxHeight: '86%',
      shadowColor: c.shadow,
      ...elevation.overlay,
    },
    sheetKeyboardAvoiding: {
      width: '100%',
    },
    sheetHandle: {
      alignSelf: 'center',
      width: dimensions.sheetHandleWidth,
      height: dimensions.sheetHandleHeight,
      borderRadius: dimensions.radiusFull,
      backgroundColor: c.borderStrong,
      marginBottom: dimensions.xs,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: dimensions.sm,
    },
    sheetTitle: {
      ...typography.subtitle,
      color: c.text,
    },
    sheetClose: {
      width: dimensions.touchTarget,
      height: dimensions.touchTarget,
      borderRadius: dimensions.radiusFull,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -dimensions.sm,
    },
    sheetCloseGlyph: {
      ...typography.subtitle,
      color: c.textSecondary,
    },
    sheetFooter: {
      paddingTop: dimensions.sm,
    },
    comingSoonBody: {
      gap: dimensions.md,
    },
    comingSoonText: {
      ...typography.body,
      color: c.textSecondary,
    },
    iconButton: {
      width: dimensions.touchTarget,
      height: dimensions.touchTarget,
      borderRadius: dimensions.radiusFull,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.border,
      backgroundColor: c.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonPressed: {
      opacity: 0.9,
    },
    iconText: {
      ...typography.subtitle,
      color: c.text,
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
      color: c.textMuted,
      textTransform: 'uppercase',
    },
    statLabelCompact: {
      fontSize: 10,
      lineHeight: 14,
    },
    statValue: {
      ...typography.title,
      color: c.text,
      marginTop: dimensions.xs,
    },
    statValueCompact: {
      fontSize: 18,
      lineHeight: 22,
      marginTop: 0,
      textAlign: 'center',
    },
  });

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: c.accent,
      shadowColor: c.accent,
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    secondary: {
      backgroundColor: c.surface,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.borderStrong,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: c.surface,
      borderWidth: dimensions.cardBorderWidth,
      borderColor: c.danger,
    },
  };

  const buttonTextStyles: Record<ButtonVariant, TextStyle> = {
    primary: { color: c.onAccent },
    secondary: { color: c.text },
    ghost: { color: c.text },
    danger: { color: c.danger },
  };

  const badgeTone = StyleSheet.create({
    neutral: { backgroundColor: c.surfaceMuted },
    success: { backgroundColor: c.successSoft },
    warning: { backgroundColor: c.warningSoft },
    danger: { backgroundColor: c.dangerSoft },
    primary: { backgroundColor: c.accentSubtle },
    accent: { backgroundColor: c.accentSubtle },
  });

  const badgeTextTone = StyleSheet.create({
    neutral: { color: c.textSecondary },
    success: { color: c.success },
    warning: { color: c.warning },
    danger: { color: c.danger },
    primary: { color: c.accent },
    accent: { color: c.accent },
  });

  const statTone = StyleSheet.create({
    primary: { borderColor: c.border },
    accent: { borderColor: c.accentSubtle },
    success: { borderColor: c.successBg },
    warning: { borderColor: c.warningBg },
  });

  return { styles, variantStyles, buttonTextStyles, badgeTone, badgeTextTone, statTone };
};
