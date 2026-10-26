/**
 * Environment switch: local backend vs production backend.
 *
 * Values come from `.env` (see `.env.example`). Expo only inlines variables when they
 * are written out in full as `process.env.EXPO_PUBLIC_NAME`, so do not refactor these
 * into dynamic lookups.
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type AppEnv = 'local' | 'production';

const rawEnv = process.env.EXPO_PUBLIC_APP_ENV;
// Explicit value wins. Otherwise: dev server -> local, release build -> production.
export const APP_ENV: AppEnv =
  rawEnv === 'local' || rawEnv === 'production' ? rawEnv : __DEV__ ? 'local' : 'production';

const LOCAL_URL = process.env.EXPO_PUBLIC_API_URL_LOCAL || 'http://localhost:8000';
const PROD_URL = process.env.EXPO_PUBLIC_API_URL_PROD || 'https://api.example.com';

/**
 * "localhost" means the PHONE itself when the app runs on a device, so it can never reach
 * the backend running on your laptop. While developing, Expo knows your laptop's LAN IP
 * (it is the host in the Metro URL, e.g. 192.168.1.20:8081), so we swap it in.
 *   - Real phone (Expo Go): uses the laptop's LAN IP, same Wi-Fi required.
 *   - Android emulator: falls back to 10.0.2.2 (the emulator's alias for the host).
 *   - iOS simulator / web: localhost works as-is.
 * Windows Firewall must allow inbound connections on port 8000 for a real phone.
 */
function resolveLocalUrl(url: string): string {
  if (Platform.OS === 'web') return url;
  const isLoopback = /\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/.test(url);
  if (!isLoopback) return url;
  const hostUri = Constants.expoConfig?.hostUri; // "192.168.1.20:8081"
  const lanHost = hostUri?.split(':')[0];
  if (lanHost && lanHost !== 'localhost' && lanHost !== '127.0.0.1') {
    return url.replace(/\/\/(localhost|127\.0\.0\.1)/, `//${lanHost}`);
  }
  if (Platform.OS === 'android') return url.replace(/\/\/(localhost|127\.0\.0\.1)/, '//10.0.2.2');
  return url;
}

export const API_URL = (APP_ENV === 'local' ? resolveLocalUrl(LOCAL_URL) : PROD_URL).replace(/\/+$/, '');

export const IS_LOCAL = APP_ENV === 'local';

/**
 * The Django dev server returns audio links like "/media/audio/..." (relative) when files are
 * stored on local disk. Make them absolute. With S3 the backend already returns full URLs.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
