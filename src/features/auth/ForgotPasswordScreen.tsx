import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { resetPassword } from '@/services/auth.service';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<Navigation>();

  async function handleReset() {
    try {
      setLoading(true);
      await resetPassword(email);
      Alert.alert('Reset link queued', 'A password reset email would be sent in the real app.');
      navigation.navigate('Login');
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
    <Screen onBack={handleBack} scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Forgot password</Text>
        <Text style={styles.subtitle}>Request a reset link for your account.</Text>
      </View>
      <Card style={styles.card}>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Button label="Send reset link" onPress={handleReset} loading={loading} />
      </Card>
      <Text style={styles.helper}>
        Use the same email that you used to sign up.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    paddingBottom: 12,
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
  },
  card: {
    gap: 16,
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
