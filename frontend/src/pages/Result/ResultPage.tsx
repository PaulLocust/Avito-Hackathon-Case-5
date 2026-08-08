import { Space, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { getSessionResult } from '../../api/sessions';
import { ApiError } from '../../entities/apiError';
import { formatDuration } from '../../entities/format';
import { roleLabel } from '../../entities/labels';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';
import { NextStepCard } from '../../shared/components/NextStepCard';
import { AttemptHistory } from './AttemptHistory';
import { BreakdownList } from './BreakdownList';
import { Recommendations } from './Recommendations';
import { ScoreSummary } from './ScoreSummary';
import { SignalMap } from './SignalMap';

export function ResultPage() {
  const { sessionId = '' } = useParams();

  const resultQuery = useQuery({
    queryKey: ['session-result', sessionId],
    queryFn: () => getSessionResult(sessionId),
  });

  if (resultQuery.isLoading) {
    return <LoadingState text="Собираем разбор…" />;
  }

  if (resultQuery.isError) {
    const error = resultQuery.error;
    if (error instanceof ApiError && error.code === 'session_not_finished') {
      return (
        <Typography.Paragraph>
          Тренировка ещё не завершена.{' '}
          <Link to={`/session/${sessionId}`}>Вернуться к прохождению</Link>.
        </Typography.Paragraph>
      );
    }
    return <ErrorState error={error} onRetry={() => resultQuery.refetch()} />;
  }

  const result = resultQuery.data;
  if (!result) {
    return null;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Space wrap>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {result.scenario.title}
          </Typography.Title>
          <Typography.Text type="secondary">{roleLabel(result.scenario.role)}</Typography.Text>
        </Space>
        {result.duration_seconds !== undefined ? (
          <Typography.Text type="secondary">
            {' '}
            · длительность {formatDuration(result.duration_seconds)}
          </Typography.Text>
        ) : null}
      </div>

      <ScoreSummary score={result.score} comparison={result.comparison} />
      <SignalMap signals={result.signals} />
      <Recommendations items={result.recommendations} />
      <BreakdownList items={result.breakdown} />

      <NextStepCard suggestion={result.next_step} />

      <AttemptHistory scenarioCode={result.scenario.code} />
    </Space>
  );
}
