import { Card, Col, Row, Segmented, Space, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { listRiskSignals } from '../../api/riskSignals';
import { getSignalProgress } from '../../api/progress';
import type { Side } from '../../api/types';
import { useAuth } from '../../features/auth/useAuth';
import { sideLabels, signalStatusLabels } from '../../entities/labels';
import { EmptyState } from '../../shared/components/EmptyState';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';

const sideOptions: { label: string; value: 'all' | Side }[] = [
  { label: 'Все', value: 'all' },
  { label: 'Покупатель', value: 'buyer' },
  { label: 'Продавец', value: 'seller' },
];

const statusColors: Record<string, string> = {
  mastered: 'green',
  weak: 'red',
  unknown: 'default',
};

/** Справочник признаков риска с фильтром по стороне сделки (FR28). */
export function ReferencePage() {
  const { user } = useAuth();
  const [side, setSide] = useState<'all' | Side>('all');

  const signalsQuery = useQuery({
    queryKey: ['risk-signals', side],
    queryFn: () => listRiskSignals(side === 'all' ? undefined : side),
  });

  const progressQuery = useQuery({
    queryKey: ['signal-progress'],
    queryFn: getSignalProgress,
    enabled: user !== null,
  });

  const statusByCode = new Map(
    (progressQuery.data?.items ?? []).map((item) => [item.code, item.status]),
  );

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={4}>Справочник признаков риска</Typography.Title>
        <Segmented
          options={sideOptions}
          value={side}
          onChange={(value) => setSide(value as 'all' | Side)}
          block
        />
      </div>

      {signalsQuery.isLoading ? (
        <LoadingState text="Загружаем справочник…" />
      ) : signalsQuery.isError ? (
        <ErrorState error={signalsQuery.error} onRetry={() => signalsQuery.refetch()} />
      ) : signalsQuery.data?.items.length ? (
        <Row gutter={[16, 16]}>
          {signalsQuery.data.items.map((signal) => {
            const status = statusByCode.get(signal.code);
            return (
              <Col xs={24} md={12} lg={8} key={signal.code}>
                <Link to={`/signals/${encodeURIComponent(signal.code)}`}>
                  <Card hoverable title={signal.title} className="signal-card">
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <Tag>{sideLabels[signal.side]}</Tag>
                      <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        {signal.summary}
                      </Typography.Paragraph>
                      {status ? (
                        <Tag color={statusColors[status]}>{signalStatusLabels[status]}</Tag>
                      ) : null}
                    </Space>
                  </Card>
                </Link>
              </Col>
            );
          })}
        </Row>
      ) : (
        <EmptyState description="Признаков риска пока нет" />
      )}
    </Space>
  );
}
