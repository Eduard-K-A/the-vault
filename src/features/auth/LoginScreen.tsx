import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { signIn } from '@/services/auth.service';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<Navigation>();
  const [email, setEmail] = useState('eduard@gmail.com');
  const [password, setPassword] = useState('11111111');
  const [showPassword, setShowPassword] = useState(false);
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
    <Screen onBack={handleBack} scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue.</Text>
      </View>
      <Card style={styles.card}>
        <View style={styles.stack}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <View>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Your password"
            />
            <View style={styles.toggleRow}>
              <Button
                label={showPassword ? 'Hide password' : 'Show password'}
                variant="ghost"
                onPress={() => setShowPassword((value) => !value)}
                fullWidth={false}
              />
            </View>
          </View>
        </View>
        <View style={styles.linkRow}>
          <Button label="Forgot password" variant="ghost" onPress={() => navigation.navigate('ForgotPassword')} fullWidth={false} />
          <Button label="Create account" variant="secondary" onPress={() => navigation.navigate('Signup')} fullWidth={false} />
        </View>
        <Button label="Continue" onPress={handleSignIn} loading={loading} />
      </Card>
    </Screen>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: {
    gap: dimensions.xs,
    paddingTop: dimensions.md,
    paddingBottom: dimensions.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
  card: {
    gap: dimensions.md,
  },
  stack: {
    gap: dimensions.md,
  },
  toggleRow: {
    alignItems: 'flex-end',
    marginTop: dimensions.xs,
  },
  linkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.sm,
    justifyContent: 'space-between',
  },
});
