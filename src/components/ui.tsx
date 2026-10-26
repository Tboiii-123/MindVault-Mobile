import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { radius, shadow, spacing, type, useTheme } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

/* ------------------------------- Button ------------------------------- */
interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'soft' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}
export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, style }: ButtonProps) {
  const t = useTheme();
  const bg = { primary: t.accent, soft: t.accentSoft, ghost: 'transparent', danger: t.dangerSoft }[variant];
  const fg = { primary: t.onAccent, soft: t.accent, ghost: t.muted, danger: t.danger }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          paddingVertical: small ? 9 : 15,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: radius.pill,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        variant === 'primary' && !small ? shadow(t, 2) : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
          <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ----------------------------- IconButton ----------------------------- */
export function IconButton({
  icon,
  onPress,
  size = 22,
  color,
  background,
  style,
  accessibilityLabel,
}: {
  icon: IconName;
  onPress?: () => void;
  size?: number;
  color?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: size + 18,
          height: size + 18,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: background ?? 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? t.text} />
    </Pressable>
  );
}

/* ------------------------------- Input -------------------------------- */
interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  icon?: IconName;
  secure?: boolean; // password field with show/hide toggle
}
export function Input({ label, error, icon, secure, style, ...rest }: InputProps) {
  const t = useTheme();
  const [hidden, setHidden] = useState(!!secure);
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <Text style={[type.small, { color: t.muted, marginBottom: 6, fontWeight: '600' }]}>{label}</Text> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: t.surface,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: error ? t.danger : focused ? t.accent : t.border,
          paddingHorizontal: spacing.md,
        }}
      >
        {icon ? <Ionicons name={icon} size={18} color={t.muted} style={{ marginRight: 8 }} /> : null}
        <TextInput
          {...rest}
          secureTextEntry={secure && hidden}
          placeholderTextColor={t.muted}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[{ flex: 1, paddingVertical: 14, fontSize: 16, color: t.text }, style as StyleProp<TextStyle>]}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={t.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[type.small, { color: t.danger, marginTop: 4 }]}>{error}</Text> : null}
    </View>
  );
}

/* -------------------------------- Card -------------------------------- */
export function Card({ children, style, onPress, onLongPress }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: t.dark ? 1 : 0,
    borderColor: t.border,
    ...shadow(t),
  };
  if (onPress || onLongPress) {
    return (
      <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [base, { opacity: pressed ? 0.9 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{children}</View>;
}

/* -------------------------------- Chip -------------------------------- */
export function Chip({ label, tone = 'neutral', icon }: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  icon?: IconName;
}) {
  const t = useTheme();
  const palette = {
    neutral: [t.surfaceAlt, t.muted],
    accent: [t.accentSoft, t.accent],
    success: [t.dark ? '#12301F' : '#DCFCE7', t.success],
    warning: [t.dark ? '#3A2A0B' : '#FEF3C7', t.warning],
    danger: [t.dangerSoft, t.danger],
  }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette[0], paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill }}>
      {icon ? <Ionicons name={icon} size={11} color={palette[1]} /> : null}
      <Text style={[type.caption, { color: palette[1] }]}>{label}</Text>
    </View>
  );
}

/* ------------------------------- Avatar ------------------------------- */
export function Avatar({ label, size = 48 }: { label: string; size?: number }) {
  const t = useTheme();
  const isEmoji = label.length > 0 && !/^[A-Za-z0-9]{1,2}$/.test(label);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2.4, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: isEmoji ? size * 0.5 : size * 0.38, fontWeight: '800', color: t.accent }}>{label}</Text>
    </View>
  );
}

/* ----------------------------- EmptyState ----------------------------- */
export function EmptyState({ icon, title, subtitle, action }: {
  icon: IconName;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: spacing.xxl, gap: spacing.sm }}>
      <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
        <Ionicons name={icon} size={32} color={t.accent} />
      </View>
      <Text style={[type.heading, { color: t.text, textAlign: 'center' }]}>{title}</Text>
      {subtitle ? <Text style={[type.body, { color: t.muted, textAlign: 'center' }]}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </View>
  );
}

/* ---------------------------- Segmented tabs --------------------------- */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surfaceAlt, borderRadius: radius.pill, padding: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center', backgroundColor: active ? t.surface : 'transparent' }}
          >
            <Text style={{ fontWeight: '700', fontSize: 13, color: active ? t.text : t.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
