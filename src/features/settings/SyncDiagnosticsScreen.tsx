import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, Screen } from '@/components/ui';
import { SyncDiagnosticsPanel } from '@/components/SyncDiagnosticsPanel';
import { dimensions } from '@/constants/dimensions';
import { syncPowerSyncNow } from '@/services/powersync.service';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function SyncDiagnosticsScreen() {
  const navigation = useNavigation<Navigation>();
  const [retrying, setRetrying] = React.useState(false);

  async function handleRetrySync() {
    try {
      setRetrying(true);
      await syncPowerSyncNow('sync-diagnostics-retry');
      Alert.alert('Sync complete', 'Pending uploads were checked.');
    } catch (error) {
      Alert.alert('Sync failed', error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Screen
      title="Sync Diagnostics"
      onBack={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }}
      scrollable
      contentStyle={styles.content}
    >
      <View style={styles.stack}>
        <SyncDiagnosticsPanel />
        <Button label="Retry sync" onPress={handleRetrySync} loading={retrying} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: dimensions.xl,
  },
  stack: {
    gap: dimensions.md,
  },
});
