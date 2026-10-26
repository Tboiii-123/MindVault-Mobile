import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '../api/endpoints';
import type { SearchResponse } from '../api/types';
import { Avatar, Card, Chip, EmptyState } from '../components/ui';
import type { RootNav } from '../navigation/types';
import { radius, spacing, type, useTheme } from '../theme';
import { errorMessage, parseHighlight, timeAgo } from '../utils/format';

/**
 * Keyword search (Postgres full-text) across container titles, typed notes, voice transcripts and
 * AI summaries. Debounced: it fires 350 ms after you stop typing.
 *
 * TODO(BIG): Semantic search + "Ask my notes". When the backend adds embeddings (pgvector) and a
 * RAG endpoint (e.g. POST /ask/ {question} -> {answer, sources[]}):
 *   1. Add `API.ask(question)` in api/endpoints.ts with its types.
 *   2. Replace the teaser card below with a mode switch ("Search" | "Ask AI").
 *   3. Render the answer as a chat bubble with tappable source entries (navigate to the container).
 * TODO(BIG): Filters (by container, tag, date range, voice-only). The API already accepts
 * `container=` ; add `tag`/date params on the backend first.
 */
export default function SearchScreen() {
  const t = useTheme();
  const nav = useNavigation<RootNav>();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRes(null);
      setError(null);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await API.search(term);
        if (!cancelled) {
          setRes(r);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q]);

  const empty = res && res.containers.length === 0 && res.entries.length === 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ padding: spacing.xl, paddingBottom: spacing.md }}>
        <Text style={[type.display, { color: t.text, marginBottom: spacing.lg }]}>Search</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: radius.pill, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: t.border }}>
          <Ionicons name="search" size={18} color={t.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search notes, transcripts, summaries"
            placeholderTextColor={t.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 10, fontSize: 16, color: t.text }}
          />
          {loading ? <ActivityIndicator size="small" color={t.accent} /> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md }} keyboardShouldPersistTaps="handled">
        {error ? <Text style={[type.small, { color: t.danger }]}>{error}</Text> : null}

        {!res && !error ? (
          <>
            <EmptyState icon="search-outline" title="Find anything you've said or typed" subtitle='Try a word like "redis". Use "quotes" for an exact phrase or -word to exclude one.' />
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, opacity: 0.75 }}>
              <Avatar label="✨" />
              <View style={{ flex: 1 }}>
                <Text style={[type.heading, { color: t.text }]}>Ask your notes</Text>
                <Text style={[type.small, { color: t.muted }]}>AI answers from your own notes. Coming soon.</Text>
              </View>
              <Chip label="SOON" tone="accent" />
            </Card>
          </>
        ) : null}

        {empty ? <EmptyState icon="file-tray-outline" title="No matches" subtitle={`Nothing found for "${res?.query}".`} /> : null}

        {res && res.containers.length > 0 ? (
          <>
            <Text style={[type.caption, { color: t.muted, marginTop: spacing.sm }]}>NOTES</Text>
            {res.containers.map((c) => (
              <Card key={c.id} onPress={() => nav.navigate('Container', { id: c.id, title: c.title, icon: c.icon })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Avatar label={c.icon || '📝'} size={42} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.heading, { color: t.text }]} numberOfLines={1}>{c.title}</Text>
                  <Text style={[type.small, { color: t.muted }]}>{c.entry_count} entries</Text>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {res && res.entries.length > 0 ? (
          <>
            <Text style={[type.caption, { color: t.muted, marginTop: spacing.sm }]}>ENTRIES</Text>
            {res.entries.map((h) => (
              <Card key={h.id} onPress={() => nav.navigate('Container', { id: h.container_id, title: h['container__title'] })} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name={h.kind === 'voice' ? 'mic' : 'document-text'} size={14} color={t.accent} />
                  <Text style={[type.small, { color: t.accent, fontWeight: '700', flex: 1 }]} numberOfLines={1}>{h['container__title']}</Text>
                  <Text style={[type.small, { color: t.muted }]}>{timeAgo(h.created_at)}</Text>
                </View>
                <Text style={[type.body, { color: t.text }]}>
                  {parseHighlight(h.snippet).map((p, i) => (
                    <Text key={i} style={p.mark ? { fontWeight: '800', backgroundColor: t.accentSoft, color: t.accent } : undefined}>
                      {p.text}
                    </Text>
                  ))}
                </Text>
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
