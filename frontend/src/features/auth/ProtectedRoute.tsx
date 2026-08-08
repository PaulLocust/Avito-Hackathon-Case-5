import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { LoadingState } from '../../shared/components/LoadingState';
import { useAuth } from './useAuth';

/** Экран доступен только авторизованному пользователю; гость уходит на вход. */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <LoadingState text="Загружаем ваши данные…" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
