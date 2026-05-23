import React, { useState } from 'react';
import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { Button, Card, Input, Screen } from '@/components/ui';
import { joinBusiness } from '@/services/business.service';
import { useAuthStore } from '@/store/authStore';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function JoinBusinessScreen() {
  const navigation = useNavigation<Navigation>();
  const userId = useAuthStore((state) => state.userId);
  const [joinCode, setJoinCode] = useState('A3X9KL');
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      await joinBusiness({ joinCode, userId });
      navigation.navigate('BusinessSelection');
    } catch (error) {
      Alert.alert('Join failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Join business" subtitle="Enter the 6-character join code from the owner.">
      <Card style={{ gap: 16 }}>
        <Input
          label="Join code"
          value={joinCode}
          onChangeText={(value) => setJoinCode(value.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
        />
        <Button label="Join" onPress={handleJoin} loading={loading} />
        <Button label="Back" variant="secondary" onPress={() => navigation.goBack()} />
      </Card>
    </Screen>
  );
}

