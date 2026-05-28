import React, { useState } from 'react';
import { Alert, Text, View, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { createBusiness } from '@/services/business.service';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function CreateBusinessScreen() {
  const navigation = useNavigation<Navigation>();
  const [name, setName] = useState('Northwind Market');
  const [address, setAddress] = useState('Makati City');
  const [branchName, setBranchName] = useState('Main Branch');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    try {
      setLoading(true);
      const result = await createBusiness({ name, address, branchName });
      navigation.navigate('BusinessCreated', { joinCode: result.business.join_code });
    } catch (error) {
      Alert.alert('Create business failed', error instanceof Error ? error.message : 'Unknown error');
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
        <Text style={styles.title}>Create business</Text>
        <Text style={styles.subtitle}>Set up your first workspace.</Text>
      </View>
      <Card style={styles.card}>
        <View style={styles.stack}>
          <Input label="Business name" value={name} onChangeText={setName} />
          <Input label="Address" value={address} onChangeText={setAddress} />
          <Input label="First branch" value={branchName} onChangeText={setBranchName} />
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <Text style={styles.infoBody}>A join code is generated, then your team can join and start selling immediately.</Text>
        </View>
        <Button label="Create" onPress={handleCreate} loading={loading} />
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
  stack: {
    gap: dimensions.md,
  },
  infoCard: {
    gap: dimensions.xs,
    padding: dimensions.md,
    borderRadius: dimensions.radiusMd,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  infoBody: {
    ...typography.body,
    color: colors.textMuted,
  },
});
