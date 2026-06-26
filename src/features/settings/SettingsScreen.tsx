import React from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Input, RowGroup, Screen, SettingsRow } from '@/components/ui';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { colors } from '@/constants/colors';
import { dimensions } from '@/constants/dimensions';
import { typography } from '@/constants/typography';
import { db, powersync } from '@/db/powersync';
import { signOut } from '@/services/auth.service';
import { useAuthStore } from '@/store/authStore';
import { useBusinessStore } from '@/store/businessStore';
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
      subtitle={`${business?.name ?? 'No business'}${branch?.name ? ` · ${branch.name}` : ''}`}
      action={<SyncStatusBadge />}
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
            <Text style={styles.note}>Photo upload is coming soon. Paste a URL for now.</Text>
          </View>
          <Button label="Save profile" onPress={handleSaveProfile} loading={saving} />
        </Card>

        <RowGroup label="Workspace">
          <SettingsRow
            glyph="⋯"
            title="Switch business"
            caption="Choose another linked workspace"
            onPress={clearActiveBusiness}
          />
          <SettingsRow
            glyph="↻"
            title="Sync diagnostics"
            caption="Pending uploads and retry tools"
            onPress={() => navigation.navigate('SyncDiagnostics')}
          />
        </RowGroup>

        <Button label="Log out" variant="ghost" onPress={handleLogout} />
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
  note: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
