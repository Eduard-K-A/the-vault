import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function LandingScreen() {
  const navigation = useNavigation<Navigation>();

  return (
    <Screen title="The Vault" subtitle="Offline-first point of sale for cashiers and owners.">
      <Card style={styles.hero}>
        <Text style={styles.heroLabel}>Mobile POS</Text>
        <Text style={styles.heroTitle}>Cashier flows stay local. Sync happens in the background.</Text>
        <Text style={styles.heroBody}>
          Login to continue or create an account to set up a new business workspace.
        </Text>
      </Card>
      <View style={styles.actions}>
        <Button label="Log in" onPress={() => navigation.navigate('Login')} />
        <Button label="Create account" variant="secondary" onPress={() => navigation.navigate('Signup')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: dimensions.md,
  },
  heroLabel: {
    ...typography.caption,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
  },
  heroTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  heroBody: {
    ...typography.body,
    color: colors.textMuted,
  },
  actions: {
    gap: dimensions.sm,
  },
});

