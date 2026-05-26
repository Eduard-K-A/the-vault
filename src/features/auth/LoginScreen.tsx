import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { signIn } from '@/services/auth.service';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<Navigation>();
  const [email, setEmail] = useState('cashier@thevault.local');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    try {
      setLoading(true);
      await signIn({ email, password });
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Landing');
  }

  return (
    <Screen title="Log in" subtitle="Use your Supabase-backed account to access the workspace." onBack={handleBack}>
      <Card style={styles.card}>
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button label="Continue" onPress={handleSignIn} loading={loading} />
        <View style={styles.inlineLinks}>
          <Button label="Forgot password" variant="ghost" onPress={() => navigation.navigate('ForgotPassword')} fullWidth={false} />
          <Button label="Create account" variant="secondary" onPress={() => navigation.navigate('Signup')} fullWidth={false} />
        </View>
      </Card>
      <Text style={styles.helper}>Demo credentials: owner@thevault.local or cashier@thevault.local</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: dimensions.md,
  },
  inlineLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.sm,
    justifyContent: 'space-between',
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
