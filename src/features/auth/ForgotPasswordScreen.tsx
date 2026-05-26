import React, { useState } from 'react';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
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

  return (
    <Screen title="Forgot password" subtitle="Request a reset link for your account." onBack={() => navigation.goBack()}>
      <Card style={{ gap: 16 }}>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Button label="Send reset link" onPress={handleReset} loading={loading} />
      </Card>
    </Screen>
  );
}
