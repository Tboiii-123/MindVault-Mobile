import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API } from '../api/endpoints';
import type { Container, Entry, SummaryPeriod } from '../api/types';
import { Composer } from '../components/Composer';
import { EntryBubble } from '../components/EntryBubble';
import { ActionSheet, PromptModal, SheetOption } from '../components/Overlays';
import { Button, Card, EmptyState, IconButton } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { spacing, type, useTheme } from '../theme';
import { errorMessage, isInFlight } from '../utils/format';

/**
 * A container is a chat-like timeline: newest message at the bottom, older ones load as you scroll up.
 *
 * Status handling: new entries come back as "pending"; the Celery worker moves them through
 * transcribing -> analyzing -> completed. We poll those entries every 2.5 s (see effect below).
 *
 * TODO(BIG): Replace polling with push updates. Add Server-Sent Events or a WebSocket
 * (Django Channels + Redis channel layer) that emits {entry_id, status} from the Celery task in
 * apps/ai/tasks.py, then subscribe here instead of setInterval.
 *
 * TODO(BIG): "Ask this note" / study tools bar (explain simply, generate questions, flashcards).
 * Backend Phase 2/3: pgvector embeddings + endpoints like POST /containers/{id}/ask/ and
 * /containers/{id}/study/questions/. Add them to api/endpoints.ts and put a button row above the Composer.
 *
 * TODO(BIG): Selective entry sharing and collaborators (ContainerMember roles). Needs backend models
 * first; then add a "People" screen reachable from the menu below.
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Container'>;

const PERIODS: { label: string; value: SummaryPeriod }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'Everything', value: 'all' },
];

export default function ContainerScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const t = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  const [container, setContainer] = useState<Container | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [entryMenu, setEntryMenu] = useState<Entry | null>(null);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  /* ----------------------------- loading ----------------------------- */
  const load = useCallback(async () => {
    try {
      const [c, page] = await Promise.all([API.containers.get(id), API.entries.list(id)]);
      setContainer(c);
      setEntries(page.results);
      setNext(page.next);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  const loadOlder = async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await API.entries.list(id, { cursorUrl: next });
      setEntries((p) => [...p, ...page.results]);
      setNext(page.next);
    } catch (e) {
      Alert.alert("Couldn't load older notes", errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  };

  /* ------------------- poll entries still being processed ------------------- */
  const inFlightKey = useMemo(() => entries.filter((e) => isInFlight(e.status)).map((e) => e.id).join(','), [entries]);
  useEffect(() => {
    if (!inFlightKey) return;
    let stopped = false;
    const timer = setInterval(async () => {
      const fresh = (await Promise.all(inFlightKey.split(',').map((i) => API.entries.get(i).catch(() => null)))).filter(
        (e): e is Entry => e !== null,
      );
      if (stopped || fresh.length === 0) return;
      const byId = new Map(fresh.map((e) => [e.id, e]));
      setEntries((prev) => prev.map((e) => byId.get(e.id) ?? e));
      if (fresh.some((e) => !isInFlight(e.status))) {
        // The AI may have just named the container, so refresh its title.
        API.containers.get(id).then((c) => !stopped && setContainer(c)).catch(() => undefined);
      }
    }, 2500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [inFlightKey, id]);

  /* ------------------------ poll a pending summary ------------------------ */
  const summaryPending = container?.summary_status === 'pending';
  useEffect(() => {
    if (!summaryPending) return;
    const timer = setInterval(() => API.containers.get(id).then(setContainer).catch(() => undefined), 2500);
    return () => clearInterval(timer);
  }, [summaryPending, id]);

  /* ------------------------------- header ------------------------------- */
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 230 }}>
          <Text style={{ fontSize: 20 }}>{container?.icon || route.params.icon || '📝'}</Text>
          <Text style={[type.heading, { color: t.text, flexShrink: 1 }]} numberOfLines={1}>
            {container?.title ?? route.params.title ?? 'Note'}
          </Text>
        </View>
      ),
      headerRight: () => <IconButton icon="ellipsis-horizontal" onPress={() => setMenuOpen(true)} accessibilityLabel="Menu" />,
    });
  }, [navigation, container, route.params, t]);

  /* ------------------------------ actions ------------------------------ */
  const addEntry = (e: Entry) => {
    setEntries((p) => [e, ...p]);
    setContainer((c) => (c ? { ...c, entry_count: c.entry_count + 1 } : c));
  };
  const sendText = async (text: string) => addEntry(await API.entries.createText(id, text));
  const sendAudio = async (uri: string) => addEntry(await API.entries.createAudio(id, uri));

  const replaceEntry = (e: Entry) => setEntries((p) => p.map((x) => (x.id === e.id ? e : x)));

  const retry = async (e: Entry) => {
    try {
      replaceEntry(await API.entries.retry(e.id));
    } catch (err) {
      Alert.alert("Couldn't retry", errorMessage(err));
    }
  };

  const confirmDeleteEntry = (e: Entry) =>
    Alert.alert('Delete this entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.entries.remove(e.id);
            setEntries((p) => p.filter((x) => x.id !== e.id));
            setContainer((c) => (c ? { ...c, entry_count: Math.max(0, c.entry_count - 1) } : c));
          } catch (err) {
            Alert.alert("Couldn't delete", errorMessage(err));
          }
        },
      },
    ]);

  const summarize = async (period: SummaryPeriod) => {
    try {
      setContainer(await API.containers.summarize(id, period));
      setSummaryOpen(true);
    } catch (err) {
      Alert.alert("Couldn't start the summary", errorMessage(err));
    }
  };

  const shareLink = async (url: string | null) => {
    if (url) await Share.share({ message: url });
  };
  const publish = async () => {
    try {
      const res = await API.share.publish(id);
      setContainer((c) => (c ? { ...c, visibility: 'public', public_url: res.public_url } : c));
      await shareLink(res.public_url);
    } catch (err) {
      Alert.alert("Couldn't share", errorMessage(err));
    }
  };
  const unpublish = async () => {
    try {
      await API.share.unpublish(id);
      setContainer((c) => (c ? { ...c, visibility: 'private', public_url: null } : c));
    } catch (err) {
      Alert.alert("Couldn't stop sharing", errorMessage(err));
    }
  };

  const archive = async () => {
    if (!container) return;
    try {
      await API.containers.update(id, { status: container.status === 'active' ? 'archived' : 'active' });
      navigation.goBack();
    } catch (err) {
      Alert.alert("Couldn't update", errorMessage(err));
    }
  };

  const deleteContainer = () =>
    Alert.alert('Delete this note?', 'All entries and audio in it will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.containers.remove(id);
            navigation.goBack();
          } catch (err) {
            Alert.alert("Couldn't delete", errorMessage(err));
          }
        },
      },
    ]);

  const menuOptions: SheetOption[] = container
    ? [
        { label: 'Rename', icon: 'pencil-outline', onPress: () => setRenameOpen(true) },
        { label: 'AI summary', icon: 'sparkles-outline', onPress: () => setPeriodOpen(true) },
        container.visibility === 'public'
          ? { label: 'Share link', icon: 'share-outline', onPress: () => shareLink(container.public_url) }
          : { label: 'Share publicly', icon: 'globe-outline', onPress: publish },
        ...(container.visibility === 'public'
          ? [{ label: 'Stop sharing', icon: 'lock-closed-outline' as const, onPress: unpublish }]
          : []),
        { label: container.status === 'active' ? 'Archive' : 'Unarchive', icon: 'archive-outline', onPress: archive },
        { label: 'Delete', icon: 'trash-outline', destructive: true, onPress: deleteContainer },
      ]
    : [];

  const entryOptions = (e: Entry): SheetOption[] => [
    ...(e.status === 'completed' || e.status === 'failed'
      ? [{ label: e.kind === 'text' ? 'Edit' : 'Edit transcript', icon: 'pencil-outline' as const, onPress: () => setEditEntry(e) }]
      : []),
    ...(e.status === 'failed' ? [{ label: 'Retry', icon: 'refresh' as const, onPress: () => retry(e) }] : []),
    { label: 'Delete', icon: 'trash-outline', destructive: true, onPress: () => confirmDeleteEntry(e) },
  ];

  /* ------------------------------- render ------------------------------- */
  if (loading) return <ActivityIndicator style={{ marginTop: 64 }} color={t.accent} />;
  if (error && !container) {
    return <EmptyState icon="cloud-offline-outline" title="Can't open this note" subtitle={error} action={<Button title="Try again" small onPress={load} />} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
      {container && (container.summary_status === 'pending' || !!container.summary) ? (
        <Card style={{ margin: spacing.md, marginBottom: 0, padding: spacing.md }} onPress={() => setSummaryOpen((o) => !o)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles" size={14} color={t.accent} />
            <Text style={[type.caption, { color: t.accent, flex: 1 }]}>
              AI SUMMARY{container.summary_period ? ` · ${container.summary_period.toUpperCase()}` : ''}
            </Text>
            {container.summary_status === 'pending' ? <ActivityIndicator size="small" color={t.accent} /> : <Ionicons name={summaryOpen ? 'chevron-up' : 'chevron-down'} size={16} color={t.muted} />}
          </View>
          {container.summary_status === 'pending' ? (
            <Text style={[type.small, { color: t.muted, marginTop: 6 }]}>Summarizing…</Text>
          ) : container.summary_status === 'failed' ? (
            <Text style={[type.small, { color: t.danger, marginTop: 6 }]}>The summary failed. Try again from the menu.</Text>
          ) : (
            <Text style={[type.small, { color: t.text, marginTop: 6 }]} numberOfLines={summaryOpen ? undefined : 3}>
              {container.summary}
            </Text>
          )}
        </Card>
      ) : null}

      <FlatList
        inverted
        data={entries}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingVertical: spacing.md, flexGrow: 1 }}
        renderItem={({ item }) => (
          <EntryBubble entry={item} onRetry={() => retry(item)} onLongPress={() => setEntryMenu(item)} />
        )}
        onEndReached={loadOlder}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={loadingMore ? <ActivityIndicator color={t.accent} style={{ margin: 16 }} /> : undefined}
        ListEmptyComponent={
          <View style={{ transform: [{ scaleY: -1 }] }}>
            <EmptyState icon="chatbubble-ellipses-outline" title="Nothing here yet" subtitle="Type a note or record your voice below." />
          </View>
        }
      />

      <View style={{ paddingBottom: insets.bottom }}>
        <Composer placeholder="Add to this note…" onSendText={sendText} onSendAudio={sendAudio} />
      </View>

      <ActionSheet visible={menuOpen} title={container?.title} options={menuOptions} onClose={() => setMenuOpen(false)} />
      <ActionSheet
        visible={periodOpen}
        title="Summarize which period?"
        options={PERIODS.map((p) => ({ label: p.label, icon: 'calendar-outline' as const, onPress: () => summarize(p.value) }))}
        onClose={() => setPeriodOpen(false)}
      />
      <ActionSheet visible={!!entryMenu} options={entryMenu ? entryOptions(entryMenu) : []} onClose={() => setEntryMenu(null)} />
      <PromptModal
        visible={renameOpen}
        title="Rename note"
        initialValue={container?.title ?? ''}
        onClose={() => setRenameOpen(false)}
        onSubmit={async (title) => setContainer(await API.containers.update(id, { title }))}
      />
      <PromptModal
        visible={!!editEntry}
        title={editEntry?.kind === 'voice' ? 'Edit transcript' : 'Edit note'}
        initialValue={editEntry ? (editEntry.kind === 'text' ? editEntry.text : editEntry.transcript) : ''}
        multiline
        onClose={() => setEditEntry(null)}
        onSubmit={async (value) => {
          if (!editEntry) return;
          // Editing re-runs the AI on the new content, so the entry goes back to "pending".
          replaceEntry(await API.entries.update(editEntry.id, editEntry.kind === 'text' ? { text: value } : { transcript: value }));
        }}
      />
    </KeyboardAvoidingView>
  );
}
