import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { radius, spacing, type, useTheme } from '../theme';
import { Button } from './ui';

type IconName = keyof typeof Ionicons.glyphMap;

export interface SheetOption {
  label: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
}

/** Bottom sheet menu (works the same on iOS and Android, unlike Alert with many buttons). */
export function ActionSheet({ visible, title, options, onClose }: {
  visible: boolean;
  title?: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(10,8,30,0.45)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          onPress={() => undefined}
          style={{ backgroundColor: t.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xxl }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: t.border, marginBottom: spacing.md }} />
          {title ? <Text style={[type.small, { color: t.muted, textAlign: 'center', marginBottom: spacing.sm }]} numberOfLines={1}>{title}</Text> : null}
          {options.map((o) => (
            <Pressable
              key={o.label}
              onPress={() => {
                onClose();
                // let the modal close before running the action (avoids stacked-modal glitches on iOS)
                setTimeout(o.onPress, 250);
              }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: pressed ? t.surfaceAlt : 'transparent' })}
            >
              {o.icon ? <Ionicons name={o.icon} size={22} color={o.destructive ? t.danger : t.text} /> : null}
              <Text style={{ fontSize: 16, fontWeight: '600', color: o.destructive ? t.danger : t.text }}>{o.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Small text-input dialog (rename a container, edit a note, ...). */
export function PromptModal({ visible, title, initialValue = '', placeholder, multiline, confirmLabel = 'Save', allowEmpty, onSubmit, onClose }: {
  visible: boolean;
  title: string;
  initialValue?: string;
  placeholder?: string;
  multiline?: boolean;
  confirmLabel?: string;
  allowEmpty?: boolean;
  onSubmit: (value: string) => Promise<void> | void;
  onClose: () => void;
}) {
  const t = useTheme();
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const submit = async () => {
    if (!allowEmpty && !value.trim()) return;
    setBusy(true);
    try {
      await onSubmit(value.trim());
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(10,8,30,0.45)', justifyContent: 'center', padding: spacing.xl }}>
        <View style={{ backgroundColor: t.surface, borderRadius: radius.xl, padding: spacing.xl }}>
          <Text style={[type.heading, { color: t.text, marginBottom: spacing.md }]}>{title}</Text>
          <TextInput
            autoFocus
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={t.muted}
            multiline={multiline}
            style={{ color: t.text, fontSize: 16, backgroundColor: t.surfaceAlt, borderRadius: radius.md, padding: spacing.md, minHeight: multiline ? 120 : undefined, textAlignVertical: multiline ? 'top' : 'center' }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg }}>
            <Button title="Cancel" variant="ghost" small onPress={onClose} />
            <Button title={confirmLabel} small loading={busy} onPress={submit} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
