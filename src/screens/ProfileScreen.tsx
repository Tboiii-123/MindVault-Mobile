import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '../api/endpoints';
import type { Role } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { PromptModal } from '../components/Overlays';
import { Avatar, Button, Card, Chip, Segmented } from '../components/ui';
import { API_URL, APP_ENV } from '../config/env';
import { spacing, type, useTheme } from '../theme';
import { errorMessage, initials } from '../utils/format';

/**
 * TODO(BIG): Account deletion. The App Store requires an in-app "Delete account" if you offer
 * sign-up. Backend: `DELETE /auth/me/` that deletes the user, their containers/entries and audio
 * files (cascade already exists) and blacklists tokens. App: a confirm flow + call it here.
 * TODO(BIG): Settings: change password (needs `POST /auth/change-password/`), email change, AI
 * language, privacy policy / terms links, data export, app lock (expo-local-authentication).
 * TODO(BIG): Subscriptions / usage limits (RevenueCat) if you monetize AI features.
 */
export default function ProfileScreen() {
  const t = useTheme();
  const { user, signOut, updateProfile } = useAuth();
  const [nameOpen, setNameOpen] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; detail: string } | null>(null);
  const [checking, setChecking] = useState(false);

  if (!user) return null;

  const checkServer = async () => {
    setChecking(true);
    setHealth(await API.health.ready());
    setChecking(false);
  };

  const changeRole = async (role: Role) => {
    try {
      await updateProfile({ role });
    } catch (e) {
      Alert.alert("Couldn't update", errorMessage(e));
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <Text style={[type.display, { color: t.text }]}>Profile</Text>

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
          <Avatar label={initials(user.full_name || user.email)} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={[type.heading, { color: t.text }]} numberOfLines={1}>{user.full_name || 'Add your name'}</Text>
            <Text style={[type.small, { color: t.muted }]} numberOfLines={1}>{user.email}</Text>
          </View>
          <Button title="Edit" variant="soft" small onPress={() => setNameOpen(true)} />
        </Card>

        <Card style={{ gap: spacing.md }}>
          <Text style={[type.small, { color: t.muted, fontWeight: '600' }]}>I mostly use this as a…</Text>
          <Segmented<Role>
            value={user.role}
            onChange={changeRole}
            options={[
              { value: 'student', label: 'Student' },
              { value: 'professional', label: 'Pro' },
              { value: 'developer', label: 'Dev' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[type.heading, { color: t.text }]}>Server</Text>
            <Chip label={APP_ENV.toUpperCase()} tone={APP_ENV === 'local' ? 'warning' : 'success'} />
          </View>
          <Text style={[type.small, { color: t.muted }]} selectable>{API_URL}</Text>
          {health ? (
            <Text style={[type.small, { color: health.ok ? t.success : t.danger }]}>
              {health.ok ? 'Connected' : 'Problem'} · {health.detail}
            </Text>
          ) : null}
          <Button title="Test connection" variant="soft" small loading={checking} onPress={checkServer} style={{ alignSelf: 'flex-start' }} />
        </Card>

        <Button
          title="Sign out"
          variant="danger"
          icon="log-out-outline"
          onPress={() => Alert.alert('Sign out?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: signOut }])}
        />
      </ScrollView>

      <PromptModal
        visible={nameOpen}
        title="Your name"
        initialValue={user.full_name}
        placeholder="Full name"
        onClose={() => setNameOpen(false)}
        onSubmit={async (name) => updateProfile({ full_name: name })}
      />
    </SafeAreaView>
  );
}
