import { Col, Row, Segmented, Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { getProgress } from '../../api/progress';
import { listScenarios } from '../../api/scenarios';
import type { Role } from '../../api/types';
import { useAuth } from '../../features/auth/useAuth';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { NextStepCard } from '../../shared/components/NextStepCard';
import { ContinueCard } from './ContinueCard';
import { ProgressRow } from './ProgressRow';
import { ScenarioCardItem } from './ScenarioCardItem';
import { StartModal } from './StartModal';

const roleOptions: { label: string; value: Role }[] = [
  { label: 'Покупатель', value: 'buyer' },
  { label: 'Продавец', value: 'seller' },
];

export function HomePage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>('buyer');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const scenarioFromState = location.state?.scenarioCode as string | undefined;

  useEffect(() => {
    if (scenarioFromState) {
      setSelectedCode(scenarioFromState);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [scenarioFromState, navigate, location.pathname]);

  const progressQuery = useQuery({
    queryKey: ['progress'],
    queryFn: getProgress,
    enabled: user !== null,
  });

  const scenariosQuery = useQuery({
    queryKey: ['scenarios', role],
    queryFn: () => listScenarios(role),
  });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {user && progressQuery.data ? (
        <>
          <ContinueCard progress={progressQuery.data} />
          <ProgressRow progress={progressQuery.data} />
          <NextStepCard
            suggestion={progressQuery.data.next_step}
            onScenarioSelect={(code) => setSelectedCode(code)}
          />
        </>
      ) : null}

      {user && progressQuery.isError ? (
        <ErrorState error={progressQuery.error} onRetry={() => progressQuery.refetch()} />
      ) : null}

      <div>
        <Typography.Title level={4}>Выберите сценарий</Typography.Title>
        <Segmented
          options={roleOptions}
          value={role}
          onChange={(value) => setRole(value as Role)}
          block
        />
      </div>

      {scenariosQuery.isLoading ? (
        <LoadingState text="Загружаем витрину…" />
      ) : scenariosQuery.isError ? (
        <ErrorState error={scenariosQuery.error} onRetry={() => scenariosQuery.refetch()} />
      ) : scenariosQuery.data?.items.length ? (
        <Row gutter={[16, 16]}>
          {scenariosQuery.data.items.map((scenario) => (
            <Col xs={24} md={12} lg={8} key={scenario.code}>
              <ScenarioCardItem
                scenario={scenario}
                showProgress={user !== null}
                onSelect={(code) => setSelectedCode(code)}
              />
            </Col>
          ))}
        </Row>
      ) : (
        <EmptyState description="Сценариев для этой роли пока нет" />
      )}

      <StartModal
        open={selectedCode !== null}
        scenarioCode={selectedCode}
        onClose={() => setSelectedCode(null)}
      />
    </Space>
  );
}
