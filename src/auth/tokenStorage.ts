import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Tokens } from '../api/client';

// Tokens live in the OS keychain/keystore (expo-secure-store), never in plain AsyncStorage.
const KEY = 'ainotes.tokens';

export async function loadTokens(): Promise<Tokens | null> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: Tokens | null): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (tokens) globalThis.localStorage?.setItem(KEY, JSON.stringify(tokens));
      else globalThis.localStorage?.removeItem(KEY);
      return;
    }
    if (tokens) await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    /* storage unavailable: user will simply have to log in again next launch */
  }
}
