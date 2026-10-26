/**
 * Every backend endpoint, typed. Screens only import `API` from here.
 * Paths match the Django project (config/urls.py + each app's urls.py).
 *
 * Endpoints that are NOT in the backend yet (so not here): Ask My Notes, semantic search,
 * related entries, flashcards / study questions, per-entry sharing, collaborators.
 * TODO(BIG): when the backend adds them, add typed functions here first, then the screens.
 */
import { API_URL } from '../config/env';
import { request } from './client';
import type {
  AuthResponse,
  CaptureResponse,
  Container,
  ContainerStatus,
  Entry,
  Paginated,
  PublicContainer,
  Role,
  SearchResponse,
  ShareResponse,
  SummaryPeriod,
  User,
} from './types';

const V1 = '/api/v1';

/** Build a multipart part for a recorded file. React Native accepts {uri, name, type}. */
function audioPart(uri: string) {
  // expo-audio records AAC in an .m4a container on both iOS and Android.
  // The backend allows .m4a + audio/m4a (apps/containers/serializers.py).
  return { uri, name: 'voice-note.m4a', type: 'audio/m4a' } as unknown as Blob;
}

export const API = {
  /* ------------------------------ auth ------------------------------ */
  auth: {
    register: (body: { email: string; password: string; full_name?: string; role?: Role }) =>
      request<AuthResponse>(`${V1}/auth/register/`, { method: 'POST', body, auth: false }),
    login: (body: { email: string; password: string }) =>
      request<AuthResponse>(`${V1}/auth/login/`, { method: 'POST', body, auth: false }),
    logout: (refresh: string) => request<void>(`${V1}/auth/logout/`, { method: 'POST', body: { refresh } }),
    me: () => request<User>(`${V1}/auth/me/`),
    updateMe: (body: Partial<Pick<User, 'full_name' | 'role'>>) =>
      request<User>(`${V1}/auth/me/`, { method: 'PATCH', body }),
    requestPasswordReset: (email: string) =>
      request<{ detail: string }>(`${V1}/auth/password-reset/`, { method: 'POST', body: { email }, auth: false }),
    confirmPasswordReset: (body: { uid: string; token: string; new_password: string }) =>
      request<{ detail: string }>(`${V1}/auth/password-reset/confirm/`, { method: 'POST', body, auth: false }),
  },

  /* --------------------------- containers --------------------------- */
  containers: {
    /** Pass `cursorUrl` (the previous page's `next`) to load the following page. */
    list: (opts: { status?: ContainerStatus; cursorUrl?: string | null } = {}) =>
      opts.cursorUrl
        ? request<Paginated<Container>>(opts.cursorUrl)
        : request<Paginated<Container>>(`${V1}/containers/`, { query: { status: opts.status ?? 'active' } }),
    create: (body: { title?: string; icon?: string } = {}) =>
      request<Container>(`${V1}/containers/`, { method: 'POST', body }),
    get: (id: string) => request<Container>(`${V1}/containers/${id}/`),
    update: (id: string, body: { title?: string; icon?: string; status?: ContainerStatus }) =>
      request<Container>(`${V1}/containers/${id}/`, { method: 'PATCH', body }),
    remove: (id: string) => request<void>(`${V1}/containers/${id}/`, { method: 'DELETE' }),
    /** Async on the server (202). Poll `get()` until summary_status != "pending". */
    summarize: (id: string, period: SummaryPeriod = 'all') =>
      request<Container>(`${V1}/containers/${id}/summary/`, { method: 'POST', body: { period } }),
  },

  /* ----------------------------- entries ----------------------------- */
  entries: {
    list: (containerId: string, opts: { cursorUrl?: string | null; tag?: string } = {}) =>
      opts.cursorUrl
        ? request<Paginated<Entry>>(opts.cursorUrl)
        : request<Paginated<Entry>>(`${V1}/containers/${containerId}/entries/`, { query: { tag: opts.tag } }),
    createText: (containerId: string, text: string) =>
      request<Entry>(`${V1}/containers/${containerId}/entries/`, { method: 'POST', body: { text } }),
    createAudio: (containerId: string, audioUri: string) => {
      const form = new FormData();
      form.append('audio', audioPart(audioUri));
      return request<Entry>(`${V1}/containers/${containerId}/entries/`, { method: 'POST', form, timeoutMs: 120000 });
    },
    get: (id: string) => request<Entry>(`${V1}/entries/${id}/`),
    update: (id: string, body: { text?: string; transcript?: string; tags?: string[] }) =>
      request<Entry>(`${V1}/entries/${id}/`, { method: 'PATCH', body }),
    remove: (id: string) => request<void>(`${V1}/entries/${id}/`, { method: 'DELETE' }),
    /** Only valid when status === "failed" (otherwise the server answers 409). */
    retry: (id: string) => request<Entry>(`${V1}/entries/${id}/retry/`, { method: 'POST' }),
  },

  /* ------------------------ quick capture --------------------------- */
  /** Drop a thought in; the server creates + AI-names a container when none is given. */
  capture: (input: { text?: string; audioUri?: string; containerId?: string }) => {
    if (input.audioUri) {
      const form = new FormData();
      form.append('audio', audioPart(input.audioUri));
      if (input.containerId) form.append('container', input.containerId);
      return request<CaptureResponse>(`${V1}/capture/`, { method: 'POST', form, timeoutMs: 120000 });
    }
    return request<CaptureResponse>(`${V1}/capture/`, {
      method: 'POST',
      body: { text: input.text, ...(input.containerId ? { container: input.containerId } : {}) },
    });
  },

  /* ------------------------------ search ----------------------------- */
  search: (q: string, opts: { containerId?: string; limit?: number } = {}) =>
    request<SearchResponse>(`${V1}/search/`, { query: { q, container: opts.containerId, limit: opts.limit } }),

  /* ----------------------------- sharing ----------------------------- */
  share: {
    publish: (containerId: string) =>
      request<ShareResponse>(`${V1}/containers/${containerId}/share/`, { method: 'POST' }),
    unpublish: (containerId: string) =>
      request<void>(`${V1}/containers/${containerId}/share/`, { method: 'DELETE' }),
    /** Anonymous JSON of a public container (no login needed). */
    getPublic: (publicId: string) => request<PublicContainer>(`${V1}/public/${publicId}/`, { auth: false }),
  },

  /* ------------------------------ health ------------------------------ */
  health: {
    /** Not under /api/v1. Returns ok=false (instead of throwing) when the server is unreachable. */
    ready: async (): Promise<{ ok: boolean; detail: string }> => {
      try {
        const res = await fetch(`${API_URL}/health/ready/`);
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok, detail: Object.entries(data).map(([k, v]) => `${k}: ${v}`).join(' · ') || `HTTP ${res.status}` };
      } catch {
        return { ok: false, detail: 'unreachable' };
      }
    },
  },
};
