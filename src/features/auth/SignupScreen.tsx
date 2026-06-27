import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { BrandMark } from '@/components/BrandMark';
import { Button, Card, Input, Screen, SegmentedControl } from '@/components/ui';
import type { ThemeColors } from '@/constants/colors';
import { useTheme, useThemedStyles } from '@/theme';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { signUp } from '@/services/auth.service';
import type { RootStackParamList } from '@/types/navigation';
import type { UserRole } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function SignupScreen() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<Navigation>();

  async function handleSignUp() {
    try {
      setLoading(true);
      await signUp({ fullname, email, password, role });
    } catch (error) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : 'Unknown error');
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
    <Screen onBack={handleBack} action={<BrandMark compact />} scrollable>
      <View style={styles.header}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Choose a role to tailor the workspace.</Text>
      </View>
      <Card style={styles.card}>
        <View style={styles.stack}>
          <Input label="Full name" value={fullname} onChangeText={setFullname} placeholder="Your full name" />
          <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Create a password" />
        </View>
        <View style={styles.roleField}>
          <Text style={styles.roleLabel}>Role</Text>
          <SegmentedControl
            accessibilityLabel="Account role"
            value={role}
            options={[
              { label: 'Employee', value: 'employee' },
              { label: 'Owner', value: 'owner' },
            ]}
            onChange={(value) => setRole(value as UserRole)}
          />
        </View>
        <Button label="Create account" onPress={handleSignUp} loading={loading} />
      </Card>
      <Text style={styles.helper}>Owners create businesses. Employees join with a code.</Text>
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
  roleField: {
    gap: dimensions.xs,
  },
  roleLabel: {
    ...typography.label,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
