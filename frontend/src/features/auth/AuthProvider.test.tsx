import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { AuthResponse, User } from '../../api/types';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

vi.mock('../../api/auth', () => ({
  getCurrentUser: vi.fn().mockRejectedValue(new Error('нет токена')),
  logout: vi.fn().mockResolvedValue(undefined),
}));

const userB: User = { id: 'u2', nickname: 'user-b', created_at: '2026-08-01T09:15:00Z' };

function Probe() {
  const { user, signIn, signOut } = useAuth();

  return (
    <div>
      <span data-testid="user">{user?.nickname ?? 'anon'}</span>
      <button onClick={() => signIn({ token: 't2', token_type: 'Bearer', expires_at: 'x', user: userB } as AuthResponse)}>
        войти
      </button>
      <button onClick={() => void signOut()}>выйти</button>
    </div>
  );
}

function renderWithCache(seed: Record<string, unknown>) {
  const queryClient = new QueryClient();
  for (const [key, value] of Object.entries(seed)) {
    queryClient.setQueryData([key], value);
  }

  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );

  return queryClient;
}

describe('AuthProvider', () => {
  it('при входе очищает кеш персональных запросов другого пользователя', async () => {
    const queryClient = renderWithCache({ progress: { for: 'user-a' } });
    expect(queryClient.getQueryData(['progress'])).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: 'войти' }));

    expect(queryClient.getQueryData(['progress'])).toBeUndefined();
    expect(screen.getByTestId('user').textContent).toBe('user-b');
  });

  it('при выходе очищает кеш, чтобы следующий пользователь не увидел чужие данные', async () => {
    const queryClient = renderWithCache({ attempts: [{ for: 'user-a' }] });

    await userEvent.click(screen.getByRole('button', { name: 'войти' }));
    await userEvent.click(screen.getByRole('button', { name: 'выйти' }));

    expect(queryClient.getQueryData(['attempts'])).toBeUndefined();
    expect(screen.getByTestId('user').textContent).toBe('anon');
  });
});
