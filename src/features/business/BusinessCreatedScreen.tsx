import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  return (
    <Screen title="Business created" subtitle="Share this join code with employees." onBack={handleBack}>
      <Card style={styles.card}>
        <Badge label="Join code" tone="accent" />
        <Text style={styles.code}>{route.params.joinCode}</Text>
        <View style={styles.infoCard}>
          <Text style={styles.helper}>
            Employees use this code from the join flow. In the real app, the code would be validated by an Edge Function.
          </Text>
        </View>
        <Button label="Continue" onPress={() => navigation.popToTop()} />
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
    color: colors.accent,
    letterSpacing: 4,
  },
  infoCard: {
    width: '100%',
    padding: dimensions.md,
    borderRadius: dimensions.radiusMd,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helper: {
    ...typography.body,
    color: colors.textMuted,
  },
});
