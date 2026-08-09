import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getCurrentUser, logout as logoutRequest } from '../../api/auth';
import { clearStoredToken, getStoredToken, storeToken } from '../../api/client';
import type { AuthResponse, User } from '../../api/types';
import { AuthContext } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!getStoredToken()) {
      setInitializing(false);
      return;
    }
    getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearStoredToken();
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInitializing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback((response: AuthResponse) => {
    storeToken(response.token);
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Токен всё равно удаляется локально: сессия клиента завершена.
    }
    clearStoredToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, signIn, signOut }),
    [user, initializing, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
