/**
 * Low-level HTTP client.
 *  - Adds `Authorization: Bearer <access>` to every request.
 *  - On a 401 it refreshes the token ONCE (shared by all in-flight requests) and retries.
 *    The backend rotates refresh tokens, so the new refresh token is saved every time.
 *  - Turns the backend's error envelope {"error": {code, message, details}} into ApiError.
 *
 * TODO(BIG): Offline support + caching. Replace the hand-rolled fetching in screens with
 * TanStack Query (`@tanstack/react-query`) + `@tanstack/query-async-storage-persister`, so
 * lists render instantly from cache and writes queue while offline. Wrap `request()` in
 * query functions; keep this file as the transport layer.
 *
 * TODO(BIG): Error monitoring. Add Sentry (`sentry-expo` / `@sentry/react-native`) and call
 * `Sentry.captureException` for non-ApiError failures and 5xx responses here.
 */
 import { API_URL, IS_LOCAL } from '../config/env';

 export class ApiError extends Error {
   status: number;
   code: string;
   details: unknown;
   constructor(status: number, code: string, message: string, details?: unknown) {
     super(message);
     this.name = 'ApiError';
     this.status = status;
     this.code = code;
     this.details = details;
   }
   get isNetwork() {
     return this.status === 0;
   }
 }
 
 export interface Tokens {
   access: string;
   refresh: string;
 }
 
 let tokens: Tokens | null = null;
 let onTokensChanged: ((t: Tokens | null) => void) | null = null;
 let onAuthLost: (() => void) | null = null;
 
 export function configureAuth(handlers: {
   onTokensChanged: (t: Tokens | null) => void;
   onAuthLost: () => void;
 }) {
   onTokensChanged = handlers.onTokensChanged;
   onAuthLost = handlers.onAuthLost;
 }
 export function setTokens(t: Tokens | null) {
   tokens = t;
 }
 export function getTokens() {
   return tokens;
 }
 
 let refreshing: Promise<boolean> | null = null;
 
 /** Returns true if a fresh access token is available afterwards. */
 function refreshTokens(): Promise<boolean> {
   if (!tokens?.refresh) return Promise.resolve(false);
   if (!refreshing) {
     const current = tokens;
     refreshing = (async () => {
       try {
         const res = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
           body: JSON.stringify({ refresh: current.refresh }),
         });
         if (!res.ok) return false;
         const data = (await res.json()) as Partial<Tokens>;
         if (!data.access) return false;
         tokens = { access: data.access, refresh: data.refresh ?? current.refresh };
         onTokensChanged?.(tokens);
         return true;
       } catch {
         return false;
       } finally {
         refreshing = null;
       }
     })();
   }
   return refreshing;
 }
 
 type Query = Record<string, string | number | undefined | null>;
 
 export interface RequestOptions {
   method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
   body?: unknown; // sent as JSON
   form?: FormData; // sent as multipart (file uploads)
   auth?: boolean; // default true
   query?: Query;
   timeoutMs?: number;
 }
 
 function buildUrl(path: string, query?: Query) {
   // `path` can be a relative API path or an absolute URL (pagination `next` links).
   const base = /^https?:\/\//i.test(path) ? path : `${API_URL}${path}`;
   if (!query) return base;
   const qs = Object.entries(query)
     .filter(([, v]) => v !== undefined && v !== null && v !== '')
     .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
     .join('&');
   return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base;
 }
 
 /** DRF validation errors look like {"email": ["Already exists."]}; show them as one sentence. */
 function flattenDetails(details: unknown): string | null {
   if (!details) return null;
   if (typeof details === 'string') return details;
   if (Array.isArray(details)) return details.map(flattenDetails).filter(Boolean).join(' ');
   if (typeof details === 'object') {
     return Object.entries(details as Record<string, unknown>)
       .map(([k, v]) => {
         const msg = flattenDetails(v);
         return k === 'non_field_errors' || k === 'detail' ? msg : `${k}: ${msg}`;
       })
       .filter(Boolean)
       .join(' ');
   }
   return String(details);
 }
 
 function toApiError(status: number, data: any): ApiError {
   const env = data?.error;
   const code = env?.code ?? 'error';
   let message: string = env?.message ?? `Request failed (${status})`;
   if (status === 400 || status === 409) message = flattenDetails(env?.details) || message;
   if (status === 429) message = 'Too many requests. Please wait a minute and try again.';
   if (status >= 500) message = 'The server had a problem. Please try again.';
   return new ApiError(status, code, message, env?.details);
 }
 
 export async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
   const url = buildUrl(path, opts.query);
   const useAuth = opts.auth !== false;
 
   const send = async (): Promise<Response> => {
     const headers: Record<string, string> = { Accept: 'application/json' };
     if (useAuth && tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;
     let body: BodyInit | undefined;
     if (opts.form) {
       body = opts.form; // do NOT set Content-Type: fetch adds the multipart boundary itself
     } else if (opts.body !== undefined) {
       headers['Content-Type'] = 'application/json';
       body = JSON.stringify(opts.body);
     }
     const ctrl = new AbortController();
     const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000);
     try {
       return await fetch(url, { method: opts.method ?? 'GET', headers, body, signal: ctrl.signal });
     } catch {
       throw new ApiError(
         0,
         'network_error',
         IS_LOCAL
           ? `Can't reach ${API_URL}. Make sure the backend is running, your phone is on the same Wi-Fi as your computer, and Windows Firewall allows port 8000.`
           : `Can't reach the server (${API_URL}). Check your internet connection.`,
       );
     } finally {
       clearTimeout(timer);
     }
   };
 
   let res = await send();
 
   if (res.status === 401 && useAuth && tokens) {
     if (await refreshTokens()) {
       res = await send();
     } else {
       tokens = null;
       onAuthLost?.(); // refresh token expired/blacklisted -> back to the login screen
     }
   }
 
   if (res.status === 204) return undefined as T;
 
   const text = await res.text();
   let data: any = null;
   if (text) {
     try {
       data = JSON.parse(text);
     } catch {
       /* non-JSON (e.g. an HTML 500 page) */
     }
   }
   if (!res.ok) throw toApiError(res.status, data);
   return data as T;
 }
 