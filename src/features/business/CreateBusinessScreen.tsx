import React, { useState } from 'react';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
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

  return (
    <Screen title="Create business" subtitle="Set up your first workspace." onBack={() => navigation.goBack()}>
      <Card style={{ gap: 16 }}>
        <Input label="Business name" value={name} onChangeText={setName} />
        <Input label="Address" value={address} onChangeText={setAddress} />
        <Input label="First branch" value={branchName} onChangeText={setBranchName} />
        <Button label="Create" onPress={handleCreate} loading={loading} />
      </Card>
    </Screen>
  );
}
