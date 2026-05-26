import React from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Badge, Button, Card, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Route = NativeStackScreenProps<RootStackParamList, 'BusinessCreated'>['route'];

export default function BusinessCreatedScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();

  return (
    <Screen title="Business created" subtitle="Share this join code with employees." onBack={() => navigation.goBack()}>
      <Card style={styles.card}>
        <Badge label="Join code" tone="accent" />
        <Text style={styles.code}>{route.params.joinCode}</Text>
        <Text style={styles.helper}>
          Employees use this code from the join flow. In the real app, the code would be validated by an Edge Function.
        </Text>
        <Button label="Continue" onPress={() => navigation.navigate('BusinessSelection')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: dimensions.md,
    alignItems: 'flex-start',
  },
  code: {
    ...typography.title,
    color: colors.primary,
    letterSpacing: 4,
  },
  helper: {
    ...typography.body,
    color: colors.textMuted,
  },
});
