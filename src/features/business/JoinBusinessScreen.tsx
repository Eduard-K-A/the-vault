import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { joinBusiness } from '@/services/business.service';
import { useAuthStore } from '@/store/authStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function JoinBusinessScreen() {
  const navigation = useNavigation<Navigation>();
  const userId = useAuthStore((state) => state.userId);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      await joinBusiness({ joinCode, userId });
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.popToTop();
      }
    } catch (error) {
      Alert.alert('Join failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.popToTop();
  }

  return (
    <Screen title="POSly" onBack={handleBack}>
      <View style={styles.header}>
        <Text style={styles.title}>Join business</Text>
        <Text style={styles.subtitle}>Enter the 6-character join code from the owner.</Text>
      </View>
      <Card style={styles.card}>
        <Input
          label="Join code"
          value={joinCode}
          onChangeText={(value) => setJoinCode(value.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
        />
        <View style={styles.helperCard}>
          <Text style={styles.helperTitle}>Need a code?</Text>
          <Text style={styles.helperBody}>Ask the owner to create a workspace and share the code from the confirmation screen.</Text>
        </View>
        <Button label="Join" onPress={handleJoin} loading={loading} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: dimensions.xs,
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
  helperCard: {
    gap: dimensions.xs,
    padding: dimensions.md,
    borderRadius: dimensions.radiusMd,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helperTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  helperBody: {
    ...typography.body,
    color: colors.textMuted,
  },
});
