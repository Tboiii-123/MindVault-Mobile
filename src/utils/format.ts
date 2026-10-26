import type { EntryStatus } from '../api/types';

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 45) return 'just now';
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function formatDuration(totalSeconds?: number | null): string {
  if (!totalSeconds || totalSeconds < 0) return '0:00';
  const s = Math.round(totalSeconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** "…use <mark>Redis</mark> for…" -> [{text, mark}] so the UI can bold the matches. */
export function parseHighlight(snippet: string): { text: string; mark: boolean }[] {
  const parts: { text: string; mark: boolean }[] = [];
  const re = /<mark>(.*?)<\/mark>/gis;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(snippet))) {
    if (m.index > last) parts.push({ text: snippet.slice(last, m.index), mark: false });
    parts.push({ text: m[1], mark: true });
    last = m.index + m[0].length;
  }
  if (last < snippet.length) parts.push({ text: snippet.slice(last), mark: false });
  return parts;
}

export const IN_FLIGHT: EntryStatus[] = ['pending', 'transcribing', 'analyzing'];
export const isInFlight = (s: EntryStatus) => IN_FLIGHT.includes(s);

export const STATUS_LABEL: Record<EntryStatus, string> = {
  pending: 'Queued…',
  transcribing: 'Transcribing…',
  analyzing: 'Analyzing…',
  completed: 'Done',
  failed: 'Failed',
};

export function initials(nameOrEmail: string): string {
  const base = nameOrEmail.split('@')[0].replace(/[._-]+/g, ' ').trim();
  const words = base.split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')).toUpperCase();
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}
