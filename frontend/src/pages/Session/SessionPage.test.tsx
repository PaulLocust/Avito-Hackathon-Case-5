import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { AnswerResult, SessionState } from '../../api/types';
import { SessionPage } from './SessionPage';

vi.mock('../../api/sessions', () => ({
  getSession: vi.fn(),
  submitAnswer: vi.fn(),
}));

import { getSession, submitAnswer } from '../../api/sessions';

const getSessionMock = vi.mocked(getSession);
const submitAnswerMock = vi.mocked(submitAnswer);

const baseSession: SessionState = {
  id: 'sess-1',
  scenario: {
    code: 'booking-link',
    title: 'Бронь по ссылке',
    role: 'buyer',
    difficulty: 'demo',
    version: 1,
  },
  status: 'in_progress',
  current_step: {
    code: 's1',
    type: 'dialog',
    position: 1,
    content: { message: 'Продавец просит предоплату по ссылке', sender: 'counterparty' },
    options: [
      { code: 'a', text: 'Оплатить по ссылке' },
      { code: 'b', text: 'Предложить безопасную сделку' },
      { code: 'c', text: 'Игнорировать' },
    ],
  },
  score: 0,
  answers_count: 0,
  steps_total: 3,
  started_at: '2026-08-03T12:00:00Z',
};

const nextSession: SessionState = {
  ...baseSession,
  score: 10,
  answers_count: 1,
  current_step: {
    code: 's2',
    type: 'dialog',
    position: 2,
    content: { message: 'Выберите способ оплаты', sender: 'counterparty' },
    options: [
      { code: 'a', text: 'Ссылка на оплату' },
      { code: 'b', text: 'Безопасная сделка' },
      { code: 'c', text: 'Отказаться' },
    ],
  },
};

const safeAnswer: AnswerResult = {
  step_code: 's1',
  option_code: 'b',
  outcome: 'safe',
  score_delta: 10,
  feedback: 'Безопасная сделка защищает обе стороны сделки.',
  risk_signals: [],
  safe_alternative: null,
  already_answered: false,
  session_finished: false,
  session: nextSession,
};

function renderSessionPage(session: SessionState) {
  getSessionMock.mockResolvedValue(session);

  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/session/sess-1']}>
        <Routes>
          <Route path="/session/:sessionId" element={<SessionPage />} />
          <Route path="/session/:sessionId/result" element={<div>Экран результата</div>} />
          <Route path="/" element={<div>Главная</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SessionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('проходит ключевой путь: вопрос → ответ → фидбек → следующий шаг', async () => {
    submitAnswerMock.mockResolvedValue(safeAnswer);
    renderSessionPage(baseSession);

    expect(await screen.findByText('Бронь по ссылке')).toBeInTheDocument();
    expect(screen.getByText('Продавец просит предоплату по ссылке')).toBeInTheDocument();

    const safe = screen.getByRole('button', { name: 'Предложить безопасную сделку' });
    await userEvent.click(safe);

    expect(submitAnswerMock).toHaveBeenCalledWith('sess-1', { step_code: 's1', option_code: 'b' });
    expect(await screen.findByText('Безопасная сделка защищает обе стороны сделки.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Дальше/ }));
    expect(await screen.findByText('Выберите способ оплаты')).toBeInTheDocument();
  });

  it('завершённая сессия ведёт на экран результата', async () => {
    const completed: SessionState = {
      ...baseSession,
      current_step: {
        code: 's3',
        type: 'terminal',
        position: 3,
        content: { message: 'Сделка завершена', sender: 'narrator' },
        options: [],
      },
    };
    const finishedAnswer: AnswerResult = {
      ...safeAnswer,
      step_code: 's3',
      option_code: '',
      outcome: 'safe',
      session_finished: true,
      session: {
        ...nextSession,
        status: 'completed',
        current_step: null,
        answers_count: 3,
        score: 30,
      },
    };
    submitAnswerMock.mockResolvedValue(finishedAnswer);
    renderSessionPage(completed);

    expect(await screen.findByText('Сделка завершена')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /К результату/ }));

    expect(await screen.findByText('Экран результата')).toBeInTheDocument();
  });

  it('«Прервать тренировку» уводит на главную, не завершая сессию', async () => {
    submitAnswerMock.mockClear();
    renderSessionPage(baseSession);

    await screen.findByText('Бронь по ссылке');
    await userEvent.click(screen.getByRole('button', { name: /Прервать тренировку/ }));

    const modalTitles = await screen.findAllByText('Прервать тренировку?');
    expect(modalTitles.length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /^Прервать$/ }));

    expect(await screen.findByText('Главная')).toBeInTheDocument();
    expect(submitAnswerMock).not.toHaveBeenCalled();
    expect(getSessionMock).toHaveBeenCalledTimes(1);
  });
});
