import { Card, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';

import { listScenarioAttempts } from '../../api/scenarios';
import type { Attempt } from '../../api/types';
import { formatDateTime, formatPercent } from '../../entities/format';
import { ErrorState } from '../../shared/components/ErrorState';
import { LevelTag } from '../../shared/components/LevelTag';
import { LoadingState } from '../../shared/components/LoadingState';

/** История попыток по сценарию (FR24) — выводится на экране результата. */
export function AttemptHistory({ scenarioCode }: { scenarioCode: string }) {
  const attemptsQuery = useQuery({
    queryKey: ['attempts', scenarioCode],
    queryFn: () => listScenarioAttempts(scenarioCode),
  });

  if (attemptsQuery.isLoading) {
    return <LoadingState text="Загружаем историю…" />;
  }

  if (attemptsQuery.isError) {
    return <ErrorState error={attemptsQuery.error} onRetry={() => attemptsQuery.refetch()} />;
  }

  const columns: ColumnsType<Attempt> = [
    { title: 'Дата', dataIndex: 'finished_at', render: (value: string) => formatDateTime(value) },
    { title: 'Результат', dataIndex: 'percent', render: (value: number) => formatPercent(value) },
    {
      title: 'Уровень',
      dataIndex: 'level',
      render: (level: Attempt['level']) => <LevelTag level={level} />,
    },
    {
      title: 'Балл',
      dataIndex: 'score',
      render: (value: number) => <Tag>{value}</Tag>,
    },
  ];

  return (
    <Card title="История попыток">
      <Table
        rowKey="session_id"
        columns={columns}
        dataSource={attemptsQuery.data?.items ?? []}
        pagination={false}
        size="small"
        locale={{ emptyText: 'Завершённых попыток пока нет' }}
      />
    </Card>
  );
}
