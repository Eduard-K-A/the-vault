import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Badge, Button, Card, Input, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { signUp } from '@/services/auth.service';
import type { RootStackParamList } from '@/types/navigation';
import type { UserRole } from '@/types/models';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const roles: UserRole[] = ['employee', 'owner'];

export default function SignupScreen() {
  const [fullname, setFullname] = useState('New User');
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

  return (
    <Screen title="Create account" subtitle="Choose a role to tailor the workspace." onBack={() => navigation.goBack()}>
      <Card style={styles.card}>
        <Input label="Full name" value={fullname} onChangeText={setFullname} />
        <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <View style={styles.roleRow}>
          {roles.map((candidate) => (
            <Pressable key={candidate} onPress={() => setRole(candidate)} style={styles.roleButton}>
              <Badge label={candidate === role ? `${candidate} selected` : candidate} tone={candidate === role ? 'primary' : 'neutral'} />
            </Pressable>
          ))}
        </View>
        <Button label="Create account" onPress={handleSignUp} loading={loading} />
      </Card>
      <Text style={styles.helper}>Owners can create businesses after signup. Employees can join with a code.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: dimensions.md,
  },
  roleRow: {
    flexDirection: 'row',
    gap: dimensions.sm,
  },
  roleButton: {
    flex: 1,
  },
  helper: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
