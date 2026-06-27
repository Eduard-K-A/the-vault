import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { BrandMark } from '@/components/BrandMark';
import { Button, Card, Input, Screen } from '@/components/ui';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { resetPassword } from '@/services/auth.service';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function ForgotPasswordScreen() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigation = useNavigation<Navigation>();

  async function handleReset() {
    try {
      setLoading(true);
      await resetPassword(email);
      setSent(true);
      Alert.alert('Reset link queued', 'A password reset email would be sent in the real app.');
    } catch (error) {
      Alert.alert('Reset failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Login');
  }

  return (
    <Screen onBack={handleBack} scrollable contentStyle={styles.content}>
      <View style={styles.header}>
        <BrandMark compact />
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter the email linked to your account and we'll send a secure reset link.
        </Text>
      </View>

      <Card style={styles.card}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@store.com"
        />
        <Button
          label={sent ? 'Resend reset link' : 'Send reset link'}
          onPress={handleReset}
          loading={loading}
          disabled={!email.trim()}
        />
      </Card>

      {sent ? (
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            If an account exists for {email.trim()}, a reset link is on its way. Check your inbox and spam folder.
          </Text>
        </View>
      ) : (
        <Text style={styles.helper}>Use the same email that you used to sign up.</Text>
      )}

      <Pressable onPress={() => navigation.navigate('Login')} style={styles.linkRow}>
        <Text style={styles.linkPrompt}>Remembered it?</Text>
        <Text style={styles.link}>Back to sign in</Text>
      </Pressable>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  content: {
    gap: dimensions.lg,
  },
  header: {
    alignItems: 'center',
    gap: dimensions.sm,
    paddingTop: dimensions.xs,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 360,
  },
  card: {
    gap: dimensions.md,
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  notice: {
    backgroundColor: colors.successBg,
    borderRadius: dimensions.radiusLg,
    padding: dimensions.md,
  },
  noticeText: {
    ...typography.caption,
    color: colors.success,
    textAlign: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: dimensions.xs,
  },
  linkPrompt: {
    ...typography.caption,
    color: colors.textMuted,
  },
  link: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
});
