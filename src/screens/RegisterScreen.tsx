import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Role } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AuthLayout } from '../components/AuthLayout';
import { Button, Input, Segmented } from '../components/ui';
import type { AuthNav } from '../navigation/types';
import { type, useTheme } from '../theme';
import { errorMessage } from '../utils/format';

export default function RegisterScreen() {
  const t = useTheme();
  const nav = useNavigation<AuthNav>();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 8) return setError('Use a valid email and a password of at least 8 characters.');
    setLoading(true);
    setError(null);
    try {
      await signUp({ email, password, full_name: name.trim() || undefined, role });
    } catch (e) {
      setError(errorMessage(e)); // e.g. "password: This password is too common."
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Your notes are private by default."
      footer={
        <Pressable onPress={() => nav.goBack()}>
          <Text style={[type.body, { color: t.muted }]}>
            Already have an account? <Text style={{ color: t.accent, fontWeight: '700' }}>Sign in</Text>
          </Text>
        </Pressable>
      }
    >
      <Input label="Name (optional)" icon="person-outline" value={name} onChangeText={setName} placeholder="Hussein" autoComplete="name" />
      <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
      <Input label="Password" icon="lock-closed-outline" secure value={password} onChangeText={setPassword} autoCapitalize="none" placeholder="At least 8 characters" />
      <View style={{ marginBottom: 20 }}>
        <Text style={[type.small, { color: t.muted, marginBottom: 6, fontWeight: '600' }]}>I mostly use this as a…</Text>
        <Segmented<Role>
          value={role}
          onChange={setRole}
          options={[
            { value: 'student', label: 'Student' },
            { value: 'professional', label: 'Pro' },
            { value: 'developer', label: 'Dev' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </View>
      {error ? <Text style={[type.small, { color: t.danger, marginBottom: 12 }]}>{error}</Text> : null}
      <Button title="Create account" onPress={submit} loading={loading} />
    </AuthLayout>
  );
}
