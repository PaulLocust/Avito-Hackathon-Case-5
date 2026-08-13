import { ArrowRightOutlined, PauseCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Modal, Progress, Space, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { abandonSession, getSession, submitAnswer } from '../../api/sessions';
import type { AnswerResult, OptionView, StepView, SubmitAnswerRequest } from '../../api/types';
import { ApiError } from '../../entities/apiError';
import { roleLabel } from '../../entities/labels';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { FeedbackCard } from './FeedbackCard';
import { OptionList } from './OptionList';
import { StepMessage } from './StepMessage';

export function SessionPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [answeredStep, setAnsweredStep] = useState<StepView | null>(null);
  const [answer, setAnswer] = useState<AnswerResult | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);

  const sessionQuery = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId),
  });

  const submit = useMutation({
    mutationFn: (payload: SubmitAnswerRequest) => submitAnswer(sessionId, payload),
    onSuccess: (result) => setAnswer(result),
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.code === 'session_finished') {
        navigate(`/session/${sessionId}/result`);
        return;
      }
      if (
        error instanceof ApiError &&
        (error.code === 'step_not_current' || error.code === 'option_not_found')
      ) {
        void queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      }
      setSubmitError(error);
    },
  });

  const session = answer?.session ?? sessionQuery.data;

  const handleSelect = (option: OptionView) => {
    if (!session?.current_step) {
      return;
    }
    setAnsweredStep(session.current_step);
    setSubmitError(null);
    submit.mutate({
      step_code: session.current_step.code,
      option_code: option.code,
    });
  };

  const handleNext = () => {
    if (!answer) {
      return;
    }
    if (answer.session_finished || answer.session.status === 'completed') {
      navigate(`/session/${sessionId}/result`);
      return;
    }
    queryClient.setQueryData(['session', sessionId], answer.session);
    setAnswer(null);
    setAnsweredStep(null);
    setSubmitError(null);
  };

  const abandon = useMutation({
    mutationFn: () => abandonSession(sessionId),
    // Пауза, а не завершение: сессия получает статус paused, сохраняет шаг
    // и балл и предлагается к продолжению с главной (FR12). Ошибка запроса
    // не блокирует уход: сессия останется in_progress и всё равно попадёт
    // в «Продолжить тренировку». Полностью отказаться от попытки можно
    // через «Начать заново» при старте.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      void queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      navigate('/');
    },
  });

  const confirmAbandon = () => {
    Modal.confirm({
      title: 'Прервать тренировку?',
      content: 'Незавершённую тренировку можно будет продолжить с главной страницы.',
      okText: 'Прервать',
      cancelText: 'Остаться',
      onOk: () => abandon.mutate(),
    });
  };

  if (sessionQuery.isLoading) {
    return <LoadingState text="Загружаем тренировку…" />;
  }

  if (sessionQuery.isError) {
    return <ErrorState error={sessionQuery.error} onRetry={() => sessionQuery.refetch()} />;
  }

  if (sessionQuery.data?.status === 'completed') {
    return <Navigate to={`/session/${sessionId}/result`} replace />;
  }
  if (sessionQuery.data?.status === 'abandoned') {
    return <Navigate to="/" replace />;
  }

  if (!session) {
    return null;
  }

  const displayStep = answeredStep ?? session.current_step;
  const stepPosition = displayStep?.position ?? session.answers_count;

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {session.scenario.title}
            </Typography.Title>
            <Tag>{roleLabel(session.scenario.role)}</Tag>
          </Space>
          <Space>
            <Typography.Text strong>
              {displayStep
                ? `Шаг ${stepPosition} из ${session.steps_total}`
                : 'Шаг из ' + session.steps_total}
            </Typography.Text>
            <Tag color="blue">Балл: {session.score}</Tag>
          </Space>
        </Space>
        <Progress
          percent={Math.round((session.answers_count / Math.max(session.steps_total, 1)) * 100)}
          showInfo={false}
          style={{ marginTop: 8 }}
        />
      </div>

      {submitError ? (
        <Alert
          type="error"
          showIcon
          message="Не удалось зафиксировать ответ"
          description={(submitError as Error).message}
          action={
            <Button size="small" onClick={() => sessionQuery.refetch()}>
              Обновить состояние
            </Button>
          }
        />
      ) : null}

      {displayStep ? (
        <>
          <StepMessage step={displayStep} />

          {answer ? (
            <div className="chat-bubble chat-bubble--user">
              {answeredStep?.options.find((option) => option.code === answer.option_code)?.text ??
                answer.option_code}
            </div>
          ) : null}

          {answer ? (
            <FeedbackCard answer={answer} />
          ) : displayStep.type === 'terminal' ? (
            <Button type="primary" onClick={() => navigate(`/session/${sessionId}/result`)}>
              К результату
            </Button>
          ) : (
            <OptionList
              options={displayStep.options}
              disabled={submit.isPending}
              onSelect={handleSelect}
            />
          )}

          {answer ? (
            <Button type="primary" icon={<ArrowRightOutlined />} onClick={handleNext}>
              {answer.session_finished || answer.session.status === 'completed'
                ? 'К результату'
                : 'Дальше'}
            </Button>
          ) : null}
        </>
      ) : (
        <Alert
          type="info"
          showIcon
          message="Шаг не загружен"
          action={
            <Button size="small" onClick={() => sessionQuery.refetch()}>
              Обновить
            </Button>
          }
        />
      )}

      <Button icon={<PauseCircleOutlined />} loading={abandon.isPending} onClick={confirmAbandon}>
        Прервать тренировку
      </Button>
    </Space>
  );
}
