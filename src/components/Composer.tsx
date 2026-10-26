import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, Text, TextInput, View } from 'react-native';
import { radius, shadow, spacing, useTheme } from '../theme';
import { errorMessage, formatDuration } from '../utils/format';

/**
 * Chat-style input: type text, or tap the mic to record a voice note.
 * Used on Home (quick capture) and inside a container (add an entry).
 *
 * TODO(BIG): Long lectures. The backend caps uploads at 25 MB (~25 min of AAC) and the upload
 * happens only after you stop recording. For real lecture capture:
 *   1. Keep recording with the screen off (expo-audio `shouldPlayInBackground` + iOS
 *      UIBackgroundModes "audio" in app.json, Android foreground service).
 *   2. Record in 5-10 minute chunks and upload each chunk as its own entry (or add a backend
 *      "chunked upload" endpoint that stitches them).
 *   3. Upload straight to S3 with a pre-signed URL (needs a new backend endpoint) so big files
 *      skip Django, and queue uploads so they retry when the network returns.
 */
export function Composer({ placeholder, onSendText, onSendAudio }: {
  placeholder: string;
  onSendText: (text: string) => Promise<void>;
  onSendAudio: (uri: string) => Promise<void>;
}) {
  const t = useTheme();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  // A voice note that failed to upload is kept here so the user can retry instead of losing it.
  const [pendingUri, setPendingUri] = useState<string | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!recording) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [recording, pulse]);

  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      await onSendText(value);
      setText('');
    } catch (e) {
      Alert.alert("Couldn't send", errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone needed', 'Allow microphone access in your phone settings to record voice notes.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch (e) {
      Alert.alert("Couldn't start recording", errorMessage(e));
    }
  };

  const uploadAudio = async (uri: string) => {
    setSending(true);
    try {
      await onSendAudio(uri);
      setPendingUri(null);
    } catch (e) {
      setPendingUri(uri);
      Alert.alert('Voice note not sent', `${errorMessage(e)}\n\nYour recording is kept. Tap Retry when the connection works.`);
    } finally {
      setSending(false);
    }
  };

  const stopRecording = async (upload: boolean) => {
    try {
      await recorder.stop();
      setRecording(false);
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (upload && uri) await uploadAudio(uri);
    } catch (e) {
      Alert.alert("Couldn't save the voice note", errorMessage(e));
    } finally {
      setRecording(false);
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md, backgroundColor: t.bg }}>
      {pendingUri && !recording ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.dangerSoft, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm }}>
          <Ionicons name="alert-circle" size={18} color={t.danger} />
          <Text style={{ flex: 1, color: t.danger, fontSize: 13, fontWeight: '600' }}>Voice note not sent</Text>
          <Pressable onPress={() => uploadAudio(pendingUri)} disabled={sending} hitSlop={8}>
            <Text style={{ color: t.accent, fontWeight: '800' }}>{sending ? 'Sending…' : 'Retry'}</Text>
          </Pressable>
          <Pressable onPress={() => setPendingUri(null)} hitSlop={8}>
            <Text style={{ color: t.muted, fontWeight: '700' }}>Discard</Text>
          </Pressable>
        </View>
      ) : null}
      {recording ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: radius.xl, padding: spacing.sm, paddingLeft: spacing.lg, ...shadow(t) }}>
          <Animated.View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.danger, opacity: pulse, marginRight: 10 }} />
          <Text style={{ color: t.text, fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'], flex: 1 }}>
            {formatDuration(recState.durationMillis / 1000)}
          </Text>
          <Pressable onPress={() => stopRecording(false)} hitSlop={8} style={{ padding: 10 }}>
            <Ionicons name="trash-outline" size={22} color={t.muted} />
          </Pressable>
          <Pressable onPress={() => stopRecording(true)} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="arrow-up" size={22} color={t.onAccent} />
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', backgroundColor: t.surface, borderRadius: radius.xl, padding: 6, paddingLeft: spacing.lg, ...shadow(t) }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={t.muted}
            multiline
            style={{ flex: 1, color: t.text, fontSize: 16, maxHeight: 120, paddingTop: 10, paddingBottom: 10 }}
          />
          <Pressable
            onPress={hasText ? send : startRecording}
            disabled={sending}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center', opacity: sending ? 0.6 : 1, marginLeft: 6 }}
            accessibilityLabel={hasText ? 'Send' : 'Record voice note'}
          >
            <Ionicons name={hasText ? 'arrow-up' : 'mic'} size={22} color={t.onAccent} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
