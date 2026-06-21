import React from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Badge, Button, Card, Screen } from '@/components/ui';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { db, powersync } from '@/db/powersync';
import { signOut } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { Input } from '@/components/ui';
import type { RootStackParamList } from '@/types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<Navigation>();
  const userId = useAuthStore((state) => state.userId);
  const email = useAuthStore((state) => state.email);
  const fullname = useAuthStore((state) => state.fullname);
  const role = useAuthStore((state) => state.role);
  const updateIdentity = useAuthStore((state) => state.updateIdentity);
  const business = useBusinessStore((state) => state.activeBusiness);
  const branch = useBusinessStore((state) => state.activeBranch);
  const clearActiveBusiness = useBusinessStore((state) => state.clearActiveBusiness);
  const { phase, lastError } = useSyncStatus();
  const [profile, setProfile] = React.useState<{ phone_number: string | null; avatar_url: string | null; created_at: string } | null>(null);
  const [nameDraft, setNameDraft] = React.useState(fullname ?? '');
  const [phoneDraft, setPhoneDraft] = React.useState('');
  const [avatarDraft, setAvatarDraft] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      if (!userId) {
        setProfile(null);
        return;
      }
      const row = (await powersync.getOptional(
        'SELECT phone_number, avatar_url, created_at FROM profiles WHERE id = ?',
        [userId],
      )) as { phone_number: string | null; avatar_url: string | null; created_at: string } | null;
      if (!cancelled) {
        setProfile(row);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  React.useEffect(() => {
    setNameDraft(fullname ?? '');
    setPhoneDraft(profile?.phone_number ?? '');
    setAvatarDraft(profile?.avatar_url ?? '');
  }, [fullname, profile?.avatar_url, profile?.phone_number, profile]);

  async function handleSaveProfile() {
    if (!userId || !email || !role) {
      return;
    }

    const nextProfile = {
      id: userId,
      fullname: nameDraft.trim() || 'Unknown user',
      email,
      role: role,
      phone_number: phoneDraft.trim() ? phoneDraft.trim() : null,
      avatar_url: avatarDraft.trim() ? avatarDraft.trim() : null,
      created_at: profile?.created_at ?? new Date().toISOString(),
    };

    try {
      setSaving(true);
      await db.writeTransaction(async (tx) => {
        await tx.upsertProfile(nextProfile);
      });
      updateIdentity({
        email,
        fullname: nextProfile.fullname,
        role,
      });
      Alert.alert('Profile updated', 'Your name, phone number, and image were saved.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Logout failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  return (
    <Screen
      title="Settings"
      action={<Badge label={role ?? 'member'} tone="primary" />}
      scrollable
      contentStyle={styles.content}
    >
      <View style={styles.stack}>
        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarFrame}>
              {avatarDraft.trim() ? (
                <Image source={{ uri: avatarDraft.trim() }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.profileAvatarText}>{(fullname ?? 'U').slice(0, 2).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{fullname ?? 'Unknown user'}</Text>
              <Text style={styles.profileMeta}>{email ?? 'No email'}</Text>
              <Text style={styles.profileMeta}>
                {business?.name ?? 'No business selected'}
                {branch?.name ? ` · ${branch.name}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <Input label="Name" value={nameDraft} onChangeText={setNameDraft} placeholder="Your full name" />
            <Input
              label="Phone number"
              value={phoneDraft}
              onChangeText={setPhoneDraft}
              placeholder="+63 912 345 6789"
              keyboardType="phone-pad"
            />
            <Input
              label="Image URL"
              value={avatarDraft}
              onChangeText={setAvatarDraft}
              placeholder="https://example.com/avatar.jpg"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <Button label="Save profile" onPress={handleSaveProfile} loading={saving} />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>Switch business</Text>
            <Text style={styles.sectionBody}>Choose another workspace from your linked businesses.</Text>
          </View>
          <Button label="Switch business" variant="secondary" onPress={clearActiveBusiness} />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>Sync status</Text>
            <Text style={styles.sectionBody}>
              PowerSync keeps the local database in sync with the backend when the connection is available.
            </Text>
          </View>
          <View style={styles.queueRow}>
            <Badge label={phase} tone={phase === 'ready' ? 'success' : phase === 'offline' ? 'warning' : 'primary'} />
            {lastError ? <Badge label={lastError} tone="danger" /> : null}
          </View>
          <Button label="Open diagnostics" variant="secondary" onPress={() => navigation.navigate('SyncDiagnostics')} />
        </Card>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionCopy}>
            <Text style={styles.sectionTitle}>Session</Text>
            <Text style={styles.sectionBody}>End the current session on this device.</Text>
          </View>
          <Button label="Log out" variant="ghost" onPress={handleLogout} />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: dimensions.xl + 24,
  },
  stack: {
    gap: dimensions.lg,
  },
  profileCard: {
    gap: dimensions.md,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: dimensions.md,
  },
  avatarFrame: {
    width: 56,
    height: 56,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  profileAvatarText: {
    ...typography.subtitle,
    color: colors.text,
    textAlign: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    ...typography.subtitle,
    color: colors.text,
  },
  profileMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  form: {
    gap: dimensions.md,
  },
  sectionCard: {
    gap: dimensions.md,
  },
  sectionCopy: {
    gap: dimensions.xs,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  sectionBody: {
    ...typography.caption,
    color: colors.textMuted,
  },
  queueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: dimensions.xs,
  },
});
