import { Alert, Button, Modal, Space, Spin, Tag, Typography } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getScenario } from '../../api/scenarios';
import { startSession } from '../../api/sessions';
import type { ScenarioDetail } from '../../api/types';
import { ApiError } from '../../entities/apiError';
import { DifficultyTag } from '../../shared/components/DifficultyTag';
import { roleLabel } from '../../entities/labels';

interface StartModalProps {
  open: boolean;
  scenarioCode: string | null;
  onClose: () => void;
}

type View = 'confirm' | 'continue';

/** Экран подтверждения старта: модальное окно на главной (USR1). */
export function StartModal({ open, scenarioCode, onClose }: StartModalProps) {
  const navigate = useNavigate();

  const [view, setView] = useState<View>('confirm');
  const [continueSessionId, setContinueSessionId] = useState<string | null>(null);
  const [startError, setStartError] = useState<unknown>(null);

  const detailQuery = useQuery<ScenarioDetail>({
    queryKey: ['scenario', scenarioCode],
    queryFn: () => getScenario(scenarioCode as string),
    enabled: open && scenarioCode !== null,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (open) {
      setView('confirm');
      setContinueSessionId(null);
      setStartError(null);
    }
  }, [open, scenarioCode]);

  useEffect(() => {
    const activeId = detailQuery.data?.active_session_id ?? null;
    if (open && activeId) {
      setContinueSessionId(activeId);
      setView('continue');
    }
  }, [detailQuery.data, open]);

  const start = useMutation({
    mutationFn: (restart: boolean) =>
      startSession({ scenario_code: scenarioCode as string, restart }),
    onSuccess: (state) => {
      onClose();
      navigate(`/session/${state.id}`);
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.code === 'session_already_active') {
        const sessionId = error.details?.session_id as string | undefined;
        if (sessionId) {
          setContinueSessionId(sessionId);
          setView('continue');
          return;
        }
      }
      setStartError(error);
    },
  });

  const handleStart = (restart: boolean) => {
    setStartError(null);
    start.mutate(restart);
  };

  const detail = detailQuery.data;

  const footer = (() => {
    if (view === 'continue') {
      return (
        <Space>
          <Button
            type="primary"
            onClick={() => {
              if (continueSessionId) {
                onClose();
                navigate(`/session/${continueSessionId}`);
              }
            }}
          >
            Продолжить
          </Button>
          <Button danger loading={start.isPending} onClick={() => handleStart(true)}>
            Начать заново
          </Button>
        </Space>
      );
    }
    return (
      <Space>
        <Button onClick={onClose}>Отмена</Button>
        <Button type="primary" loading={start.isPending} onClick={() => handleStart(false)}>
          Начать тренировку
        </Button>
      </Space>
    );
  })();

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={detail?.title ?? 'Сценарий'}
      footer={footer}
      destroyOnHidden
    >
      {detailQuery.isLoading ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : detailQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Не удалось загрузить сценарий"
          description={detailQuery.error.message}
        />
      ) : detail ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space size={4} wrap>
            <Tag>{roleLabel(detail.role)}</Tag>
            <DifficultyTag difficulty={detail.difficulty} />
            <Tag>≈ {detail.steps_count} шагов</Tag>
            <Tag>≈ {detail.estimated_minutes} мин</Tag>
          </Space>
          <Typography.Paragraph style={{ marginBottom: 0 }}>{detail.intro}</Typography.Paragraph>

          {view === 'continue' ? (
            <Alert
              type="info"
              showIcon
              message="Есть незавершённая тренировка"
              description="Вы можете продолжить с того же шага или начать сценарий заново. Прерванная тренировка не учитывается в прогрессе."
            />
          ) : null}

          {startError ? (
            <Alert
              type="error"
              showIcon
              message="Не удалось начать тренировку"
              description={(startError as Error).message}
            />
          ) : null}
        </Space>
      ) : null}
    </Modal>
  );
}
