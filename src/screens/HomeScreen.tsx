import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API } from '../api/endpoints';
import type { Container, ContainerStatus } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Composer } from '../components/Composer';
import { ContainerCard } from '../components/ContainerCard';
import { ActionSheet, PromptModal } from '../components/Overlays';
import { Button, EmptyState, IconButton, Segmented } from '../components/ui';
import type { RootNav } from '../navigation/types';
import { spacing, type, useTheme } from '../theme';
import { errorMessage, greeting } from '../utils/format';

/**
 * Home = your list of containers + a quick-capture bar ("capture first, organize later").
 * Typing or recording here calls POST /capture/, the server creates a container, and the AI
 * names it a few seconds later (you land inside it and see the title update).
 *
 * TODO(BIG): Pinned / favourite containers, drag-to-reorder, folders or subject colours for
 * students ("Database Systems", "Operating Systems"). Needs new backend fields
 * (Container.pinned, Container.color/subject) + PATCH support, then a section header here.
 * TODO(BIG): Home-screen widget / share-sheet extension ("Share to AI Notes" from other apps).
 * Needs a native config plugin or a dev build; Expo Go can't do this.
 */
export default function HomeScreen() {
  const t = useTheme();
  const nav = useNavigation<RootNav>();
  const { user } = useAuth();

  const [tab, setTab] = useState<ContainerStatus>('active');
  const [items, setItems] = useState<Container[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<Container | null>(null);

  const load = useCallback(async () => {
    try {
      const page = await API.containers.list({ status: tab });
      setItems(page.results);
      setNext(page.next);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  // Reload whenever the tab is focused (counts/titles change while you are inside a container).
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!next || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await API.containers.list({ cursorUrl: next });
      setItems((prev) => [...prev, ...page.results]);
      setNext(page.next);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  };

  const open = (c: Pick<Container, 'id' | 'title' | 'icon'>) =>
    nav.navigate('Container', { id: c.id, title: c.title, icon: c.icon });

  const captureText = async (text: string) => {
    const res = await API.capture({ text });
    open(res.container);
  };
  const captureAudio = async (uri: string) => {
    const res = await API.capture({ audioUri: uri });
    open(res.container);
  };

  const confirmDelete = (c: Container) =>
    Alert.alert('Delete this note?', `"${c.title}" and everything in it will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await API.containers.remove(c.id);
            setItems((p) => p.filter((x) => x.id !== c.id));
          } catch (e) {
            Alert.alert("Couldn't delete", errorMessage(e));
          }
        },
      },
    ]);

  const toggleArchive = async (c: Container) => {
    try {
      await API.containers.update(c.id, { status: c.status === 'active' ? 'archived' : 'active' });
      setItems((p) => p.filter((x) => x.id !== c.id));
    } catch (e) {
      Alert.alert("Couldn't update", errorMessage(e));
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.small, { color: t.muted }]}>{greeting()}{user ? `, ${user.full_name || user.email.split('@')[0]}` : ''}</Text>
              <Text style={[type.display, { color: t.text }]}>Your notes</Text>
            </View>
            <IconButton icon="add" size={26} color={t.onAccent} background={t.accent} onPress={() => setNewOpen(true)} accessibilityLabel="New note" />
          </View>
          <View style={{ marginTop: spacing.lg }}>
            <Segmented<ContainerStatus>
              value={tab}
              onChange={(v) => {
                setLoading(true);
                setTab(v);
              }}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 48 }} color={t.accent} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.md, flexGrow: 1 }}
            renderItem={({ item }) => <ContainerCard container={item} onPress={() => open(item)} onLongPress={() => setMenuFor(item)} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={t.accent} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={t.accent} style={{ margin: 16 }} /> : undefined}
            ListEmptyComponent={
              error ? (
                <EmptyState icon="cloud-offline-outline" title="Can't load your notes" subtitle={error} action={<Button title="Try again" small onPress={load} />} />
              ) : (
                <EmptyState
                  icon={tab === 'active' ? 'sparkles-outline' : 'archive-outline'}
                  title={tab === 'active' ? 'Capture your first thought' : 'Nothing archived'}
                  subtitle={tab === 'active' ? 'Type below or tap the mic. AI will name and organize it for you.' : 'Archived notes show up here. Long-press a note to archive it.'}
                />
              )
            }
          />
        )}

        {tab === 'active' ? (
          <Composer placeholder="Capture a thought…" onSendText={captureText} onSendAudio={captureAudio} />
        ) : null}
      </KeyboardAvoidingView>

      <PromptModal
        visible={newOpen}
        title="New note"
        placeholder="Name it (or leave empty and let AI name it)"
        allowEmpty
        confirmLabel="Create"
        onClose={() => setNewOpen(false)}
        onSubmit={async (title) => {
          const c = await API.containers.create(title ? { title } : {});
          open(c);
        }}
      />
      <ActionSheet
        visible={!!menuFor}
        title={menuFor?.title}
        onClose={() => setMenuFor(null)}
        options={
          menuFor
            ? [
                { label: menuFor.status === 'active' ? 'Archive' : 'Unarchive', icon: 'archive-outline', onPress: () => toggleArchive(menuFor) },
                { label: 'Delete', icon: 'trash-outline', destructive: true, onPress: () => confirmDelete(menuFor) },
              ]
            : []
        }
      />
    </SafeAreaView>
  );
}
