import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { ProgressResponse } from '../../api/types';
import { HomePage } from './HomePage';

vi.mock('../../api/progress', () => ({
  getProgress: vi.fn(),
}));

vi.mock('../../api/scenarios', () => ({
  listScenarios: vi.fn(),
}));

vi.mock('../../features/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

import { getProgress } from '../../api/progress';
import { listScenarios } from '../../api/scenarios';
import { useAuth } from '../../features/auth/useAuth';

const getProgressMock = vi.mocked(getProgress);
const listScenariosMock = vi.mocked(listScenarios);
const useAuthMock = vi.mocked(useAuth);

const progress: ProgressResponse = {
  completed_scenarios: 1,
  total_scenarios: 2,
  attempts_count: 2,
  best_percent: 80,
  best_level: 'resilient',
  average_percent: 70,
  last_delta_percent: 10,
  active_session: {
    session_id: 'sess-1',
    scenario: {
      code: 'booking-link',
      title: 'Бронь по ссылке',
      role: 'buyer',
      difficulty: 'demo',
      version: 1,
    },
    answers_count: 2,
    steps_total: 6,
    started_at: '2026-08-03T12:00:00Z',
  },
  next_step: { type: 'new_scenario', reason: 'Ещё не пройден сценарий', scenario: null },
};

describe('HomePage', () => {
  it('показывает блок «Продолжить тренировку» для активной сессии', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'u1', nickname: 'tester', created_at: '2026-08-01T09:15:00Z' },
      initializing: false,
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    getProgressMock.mockResolvedValue(progress);
    listScenariosMock.mockResolvedValue({ items: [] });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Продолжить тренировку')).toBeInTheDocument();
    expect(screen.getByText(/шаг 3 из 6/)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /Продолжить/ });
    expect(link.getAttribute('href')).toBe('/session/sess-1');
  });
});
