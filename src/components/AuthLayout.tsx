import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IS_LOCAL, API_URL } from '../config/env';
import { radius, spacing, type, useTheme } from '../theme';

export function AuthLayout({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: spacing.xxl, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ width: 64, height: 64, borderRadius: 22, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl }}>
            <Ionicons name="sparkles" size={30} color={t.onAccent} />
          </View>
          <Text style={[type.display, { color: t.text }]}>{title}</Text>
          <Text style={[type.body, { color: t.muted, marginTop: 6, marginBottom: spacing.xl }]}>{subtitle}</Text>
          {children}
          <View style={{ flex: 1 }} />
          {footer ? <View style={{ alignItems: 'center', marginTop: spacing.xl }}>{footer}</View> : null}
          {IS_LOCAL ? (
            <Text style={{ color: t.muted, fontSize: 11, textAlign: 'center', marginTop: spacing.lg, borderRadius: radius.pill }}>
              LOCAL · {API_URL}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
