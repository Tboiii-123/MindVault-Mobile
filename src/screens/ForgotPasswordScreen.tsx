import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { API } from '../api/endpoints';
import { AuthLayout } from '../components/AuthLayout';
import { Button, Input } from '../components/ui';
import type { AuthNav } from '../navigation/types';
import { type, useTheme } from '../theme';
import { errorMessage } from '../utils/format';

/**
 * Two steps: (1) ask for the reset email, (2) enter the uid + token from the email link and a
 * new password.
 *
 * TODO(BIG): Make step 2 automatic with a deep link. The backend emails
 * `${FRONTEND_URL}/reset-password?uid=...&token=...`. Point FRONTEND_URL at a universal link
 * (https://yourdomain.com/reset-password) or the app scheme (ainotes://reset-password), add the
 * `linking` config in navigation/index.tsx, and prefill `uid` and `token` from the URL params
 * so the user only types the new password.
 */
export default function ForgotPasswordScreen() {
  const t = useTheme();
  const nav = useNavigation<AuthNav>();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [uid, setUid] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const requestReset = () =>
    run(async () => {
      await API.auth.requestPasswordReset(email.trim().toLowerCase());
      setInfo('If that account exists, we sent a reset email.');
      setStep(2);
    });

  const confirm = () =>
    run(async () => {
      await API.auth.confirmPasswordReset({ uid: uid.trim(), token: token.trim(), new_password: password });
      setInfo('Password updated. You can sign in now.');
      setTimeout(() => nav.goBack(), 1200);
    });

  return (
    <AuthLayout
      title="Reset password"
      subtitle={step === 1 ? "Enter your email and we'll send a reset link." : 'Copy the uid and token from the link in your email.'}
      footer={
        <Pressable onPress={() => nav.goBack()}>
          <Text style={[type.body, { color: t.accent, fontWeight: '700' }]}>Back to sign in</Text>
        </Pressable>
      }
    >
      {step === 1 ? (
        <>
          <Input label="Email" icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Button title="Send reset email" onPress={requestReset} loading={loading} />
        </>
      ) : (
        <>
          <Input label="uid" value={uid} onChangeText={setUid} autoCapitalize="none" autoCorrect={false} />
          <Input label="token" value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} />
          <Input label="New password" secure value={password} onChangeText={setPassword} autoCapitalize="none" />
          <Button title="Set new password" onPress={confirm} loading={loading} />
        </>
      )}
      {info ? <Text style={[type.small, { color: t.success, marginTop: 12 }]}>{info}</Text> : null}
      {error ? <Text style={[type.small, { color: t.danger, marginTop: 12 }]}>{error}</Text> : null}
    </AuthLayout>
  );
}
