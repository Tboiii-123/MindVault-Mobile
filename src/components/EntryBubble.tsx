import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import type { Entry } from '../api/types';
import { radius, spacing, type, useTheme } from '../theme';
import { isInFlight, STATUS_LABEL, timeOfDay } from '../utils/format';
import { Button, Chip } from './ui';
import { VoicePlayer } from './VoicePlayer';

/**
 * One message in a container (self-chat style). Shows text or a voice note with its transcript,
 * plus the AI extras (summary, action items, tags) once processing finishes.
 *
 * TODO(BIG): Related entries ("Related thoughts" under a bubble) and "Explain this to me" /
 * "Generate study questions" buttons need the Phase 2/3 backend endpoints (semantic search +
 * Ask My Notes). Add a typed function in api/endpoints.ts, then render the buttons here.
 */
export function EntryBubble({ entry, onLongPress, onRetry }: {
  entry: Entry;
  onLongPress: () => void;
  onRetry: () => void;
}) {
  const t = useTheme();
  const busy = isInFlight(entry.status);
  const body = entry.kind === 'text' ? entry.text : entry.transcript;

  return (
    <View style={{ alignItems: 'flex-end', marginBottom: spacing.md, paddingHorizontal: spacing.md }}>
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={300}
        style={{ maxWidth: '88%', backgroundColor: t.bubble, borderRadius: radius.lg, borderBottomRightRadius: 6, padding: spacing.md, gap: spacing.sm }}
      >
        {entry.kind === 'voice' ? (
          <View style={{ minWidth: 220 }}>
            <VoicePlayer audioUrl={entry.audio_url} durationSeconds={entry.audio_duration_seconds} />
          </View>
        ) : null}

        {body ? <Text style={[type.body, { color: t.text }]} selectable>{body}</Text> : null}

        {busy ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles" size={14} color={t.accent} />
            <Text style={[type.small, { color: t.accent, fontWeight: '600' }]}>{STATUS_LABEL[entry.status]}</Text>
          </View>
        ) : null}

        {entry.status === 'failed' ? (
          <View style={{ gap: 6 }}>
            <Text style={[type.small, { color: t.danger }]}>{entry.error_message || 'Processing failed.'}</Text>
            <View style={{ alignSelf: 'flex-start' }}>
              <Button title="Retry" icon="refresh" variant="danger" small onPress={onRetry} />
            </View>
          </View>
        ) : null}

        {entry.status === 'completed' && entry.summary ? (
          <View style={{ backgroundColor: t.surface, borderRadius: radius.md, padding: spacing.md, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="sparkles" size={13} color={t.accent} />
              <Text style={[type.caption, { color: t.accent }]}>AI SUMMARY</Text>
            </View>
            <Text style={[type.small, { color: t.text }]}>{entry.summary}</Text>
            {entry.action_items.length > 0 ? (
              <View style={{ gap: 2, marginTop: 2 }}>
                {entry.action_items.map((a, i) => (
                  <Text key={i} style={[type.small, { color: t.text }]}>
                    {'☐'} {a}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {entry.tags.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {entry.tags.map((tag) => (
              <Chip key={tag} label={`#${tag}`} tone="accent" />
            ))}
          </View>
        ) : null}

        <Text style={{ alignSelf: 'flex-end', color: t.muted, fontSize: 11 }}>{timeOfDay(entry.created_at)}</Text>
      </Pressable>
    </View>
  );
}
