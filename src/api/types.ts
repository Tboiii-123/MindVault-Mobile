/** Types mirror the Django serializers in the backend (each app's serializers.py). */

export type Role = 'student' | 'professional' | 'developer' | 'other';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  date_joined: string;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export type ContainerStatus = 'active' | 'archived';
export type Visibility = 'private' | 'public';
export type SummaryStatus = 'none' | 'pending' | 'completed' | 'failed';

export interface Container {
  id: string;
  title: string;
  icon: string;
  status: ContainerStatus;
  visibility: Visibility;
  public_url: string | null;
  entry_count: number;
  last_activity_at: string;
  created_at: string;
  summary_status: SummaryStatus;
  // Only present on the detail endpoint (GET /containers/{id}/):
  summary?: string;
  summary_period?: string;
  summary_updated_at?: string | null;
  published_at?: string | null;
}

export type EntryKind = 'text' | 'voice';
export type EntryStatus = 'pending' | 'transcribing' | 'analyzing' | 'completed' | 'failed';

export interface Entry {
  id: string;
  container_id: string;
  kind: EntryKind;
  text: string;
  transcript: string;
  summary: string;
  key_points: string[];
  action_items: string[];
  tags: string[];
  status: EntryStatus;
  error_message: string;
  audio_url: string | null;
  audio_duration_seconds: number | null;
  language: string;
  created_at: string;
  updated_at: string;
}

/** Cursor pagination: follow `next` (an absolute URL) until it is null. */
export interface Paginated<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CaptureResponse {
  container: Container;
  entry: Entry;
}

export type SummaryPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export interface SearchEntryHit {
  id: string;
  container_id: string;
  container__title: string;
  kind: EntryKind;
  created_at: string;
  rank: number;
  /** Contains <mark>…</mark> around the matched words. */
  snippet: string;
}

export interface SearchContainerHit {
  id: string;
  title: string;
  icon: string;
  entry_count: number;
}

export interface SearchResponse {
  query: string;
  containers: SearchContainerHit[];
  entries: SearchEntryHit[];
}

export interface ShareResponse {
  visibility: Visibility;
  public_id: string;
  public_url: string;
}

export interface PublicContainer {
  title: string;
  icon: string;
  author: string;
  summary: string;
  published_at: string | null;
  entries: {
    id: string;
    kind: EntryKind;
    content: string;
    summary: string;
    tags: string[];
    audio_url: string | null;
    created_at: string;
  }[];
}
