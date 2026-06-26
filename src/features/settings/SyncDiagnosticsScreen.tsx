import React from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button, ComingSoonSheet, PlaceholderAction, Screen } from '@/components/ui';
import { SyncDiagnosticsPanel } from '@/components/SyncDiagnosticsPanel';
import { dimensions } from '@/constants/dimensions';
import { syncPowerSyncNow } from '@/services/powersync.service';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function SyncDiagnosticsScreen() {
  const navigation = useNavigation<Navigation>();
  const [retrying, setRetrying] = React.useState(false);
  const [comingSoon, setComingSoon] = React.useState<string | null>(null);

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
        <Button label="Sync now" onPress={handleRetrySync} loading={retrying} />
        <PlaceholderAction
          label="Force full sync 🔒"
          message="Force full sync is coming soon. Sync now is available now."
          onUnavailable={setComingSoon}
        />
      </View>
      <ComingSoonSheet
        visible={comingSoon !== null}
        title="Force full sync"
        message={comingSoon ?? ''}
        onClose={() => setComingSoon(null)}
      />
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
