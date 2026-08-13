import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { getCurrentUser, logout as logoutRequest } from '../../api/auth';
import { clearStoredToken, getStoredToken, storeToken } from '../../api/client';
import type { AuthResponse, User } from '../../api/types';
import { AuthContext } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const queryClient = useQueryClient();

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

  const signIn = useCallback(
    (response: AuthResponse) => {
      // Кеш персональных запросов (прогресс, история попыток) сбрасывается
      // при смене пользователя: данные предыдущего аккаунта не должны
      // всплывать у нового (гость → аккаунт, A → B).
      queryClient.clear();
      storeToken(response.token);
      setUser(response.user);
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Токен всё равно удаляется локально: сессия клиента завершена.
    }
    clearStoredToken();
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, initializing, signIn, signOut }),
    [user, initializing, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
