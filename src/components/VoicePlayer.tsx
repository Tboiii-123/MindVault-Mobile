import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { resolveMediaUrl } from '../config/env';
import { useTheme } from '../theme';
import { formatDuration } from '../utils/format';

/**
 * Play button for a voice entry. The audio player is only created after the first tap, so a
 * long list of voice notes does not load dozens of players at once.
 *
 * TODO(BIG): One shared player for the whole app (mini player bar, playback speed, background
 * playback, lock-screen controls via `player.setActiveForLockScreen`) and a real waveform
 * (compute peaks on the backend when the file is processed and return them in the entry JSON).
 */
export function VoicePlayer({ audioUrl, durationSeconds }: { audioUrl: string | null; durationSeconds: number | null }) {
  const t = useTheme();
  const [started, setStarted] = useState(false);
  const uri = resolveMediaUrl(audioUrl);

  if (!uri) {
    return <Text style={{ color: t.muted, fontSize: 13 }}>Audio unavailable</Text>;
  }
  return started ? (
    <ActivePlayer uri={uri} fallbackDuration={durationSeconds} />
  ) : (
    <PlayerRow playing={false} progress={0} label={formatDuration(durationSeconds)} onPress={() => setStarted(true)} />
  );
}

function ActivePlayer({ uri, fallbackDuration }: { uri: string; fallbackDuration: number | null }) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  useEffect(() => {
    player.play();
  }, [player]);

  const duration = status.duration || fallbackDuration || 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (duration > 0 && status.currentTime >= duration - 0.2) void player.seekTo(0);
    player.play();
  };
  return (
    <PlayerRow
      playing={status.playing}
      progress={progress}
      label={`${formatDuration(status.currentTime)} / ${formatDuration(duration)}`}
      onPress={toggle}
    />
  );
}

function PlayerRow({ playing, progress, label, onPress }: { playing: boolean; progress: number; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={onPress} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={playing ? 'pause' : 'play'} size={18} color={t.onAccent} style={{ marginLeft: playing ? 0 : 2 }} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={{ height: 5, borderRadius: 3, backgroundColor: t.border, overflow: 'hidden' }}>
          <View style={{ width: `${progress * 100}%`, height: 5, backgroundColor: t.accent }} />
        </View>
        <Text style={{ color: t.muted, fontSize: 12, marginTop: 4, fontVariant: ['tabular-nums'] }}>{label}</Text>
      </View>
    </View>
  );
}
