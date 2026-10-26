import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { API } from '../api/endpoints';
import { ApiError, configureAuth, getTokens, setTokens } from '../api/client';
import type { Role, User } from '../api/types';
import { loadTokens, saveTokens } from './tokenStorage';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthValue {
  status: Status;
  user: User | null;
  /** Set when the app could not reach the server at launch (shown on the login screen). */
  bootError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; full_name?: string; role?: Role }) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'full_name' | 'role'>>) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setTokens(null);
    saveTokens(null);
    setUser(null);
    setStatus('signedOut');
  }, []);

  // Wire the HTTP client to this provider and restore a saved session on launch.
  useEffect(() => {
    configureAuth({ onTokensChanged: (t) => void saveTokens(t), onAuthLost: clearSession });
    (async () => {
      const saved = await loadTokens();
      if (!saved) return setStatus('signedOut');
      setTokens(saved);
      try {
        setUser(await API.auth.me());
        setStatus('signedIn');
      } catch (e) {
        if (e instanceof ApiError && e.isNetwork) {
          // TODO(BIG): offline launch. Cache the user + data (see TanStack Query note in api/client.ts)
          // and open the app in read-only mode instead of showing the login screen.
          setBootError(e.message);
          setStatus('signedOut');
        } else {
          clearSession();
        }
      }
    })();
  }, [clearSession]);

  const startSession = useCallback(async (res: { user: User; access: string; refresh: string }) => {
    const tokens = { access: res.access, refresh: res.refresh };
    setTokens(tokens);
    await saveTokens(tokens);
    setUser(res.user);
    setBootError(null);
    setStatus('signedIn');
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      bootError,
      signIn: async (email, password) => startSession(await API.auth.login({ email: email.trim().toLowerCase(), password })),
      signUp: async (input) =>
        startSession(await API.auth.register({ ...input, email: input.email.trim().toLowerCase() })),
      signOut: async () => {
        const refresh = getTokens()?.refresh;
        if (refresh) await API.auth.logout(refresh).catch(() => undefined); // best effort
        clearSession();
      },
      updateProfile: async (patch) => setUser(await API.auth.updateMe(patch)),
    }),
    [status, user, bootError, startSession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
