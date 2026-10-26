import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { AuthLayout } from '../components/AuthLayout';
import { Button, Input } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import type { AuthNav } from '../navigation/types';
import { type, useTheme } from '../theme';
import { errorMessage } from '../utils/format';

/**
 * TODO(BIG): Social login (Google / Apple). Backend: add `POST /auth/google/` and `/auth/apple/`
 * that verify the provider's ID token (google-auth / PyJWT + Apple JWKS) and return the same
 * {user, access, refresh} payload as /auth/login/. App: `expo-auth-session` or
 * `@react-native-google-signin/google-signin`, and `expo-apple-authentication` (iOS requires
 * "Sign in with Apple" if you offer any other social login).
 */
export default function LoginScreen() {
  const t = useTheme();
  const nav = useNavigation<AuthNav>();
  const { signIn, bootError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(bootError);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Talk or type. AI keeps your notes organized."
      footer={
        <Pressable onPress={() => nav.navigate('Register')}>
          <Text style={[type.body, { color: t.muted }]}>
            New here? <Text style={{ color: t.accent, fontWeight: '700' }}>Create an account</Text>
          </Text>
        </Pressable>
      }
    >
      <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" />
      <Input label="Password" icon="lock-closed-outline" secure value={password} onChangeText={setPassword} autoCapitalize="none" placeholder="••••••••" onSubmitEditing={submit} returnKeyType="go" />
      {error ? <Text style={[type.small, { color: t.danger, marginBottom: 12 }]}>{error}</Text> : null}
      <Button title="Sign in" onPress={submit} loading={loading} />
      <Pressable onPress={() => nav.navigate('Forgot')} style={{ alignSelf: 'center', padding: 14 }}>
        <Text style={{ color: t.muted, fontWeight: '600' }}>Forgot password?</Text>
      </Pressable>
    </AuthLayout>
  );
}
