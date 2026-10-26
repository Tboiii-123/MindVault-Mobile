import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import type { Container } from '../api/types';
import { spacing, type, useTheme } from '../theme';
import { timeAgo } from '../utils/format';
import { Avatar, Card, Chip } from './ui';

export function ContainerCard({ container, onPress, onLongPress }: {
  container: Container;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const t = useTheme();
  return (
    <Card onPress={onPress} onLongPress={onLongPress} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Avatar label={container.icon || '📝'} size={52} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[type.heading, { color: t.text }]} numberOfLines={1}>{container.title}</Text>
        <Text style={[type.small, { color: t.muted }]}>
          {container.entry_count} {container.entry_count === 1 ? 'entry' : 'entries'} · {timeAgo(container.last_activity_at)}
        </Text>
      </View>
      {container.visibility === 'public' ? <Chip label="PUBLIC" tone="success" icon="globe-outline" /> : null}
      <Ionicons name="chevron-forward" size={18} color={t.muted} />
    </Card>
  );
}
