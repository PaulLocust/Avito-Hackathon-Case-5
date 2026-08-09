import { Card, Divider, List, Space, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { getRiskSignal } from '../../api/riskSignals';
import { difficultyLabel, sideLabels } from '../../entities/labels';
import { ErrorState } from '../../shared/components/ErrorState';
import { LoadingState } from '../../shared/components/LoadingState';

/** Карточка признака риска из справочника и разбора прохождения (FR29). */
export function SignalDetailPage() {
  const { code = '' } = useParams();

  const signalQuery = useQuery({
    queryKey: ['risk-signal', code],
    queryFn: () => getRiskSignal(code),
  });

  if (signalQuery.isLoading) {
    return <LoadingState text="Загружаем карточку…" />;
  }

  if (signalQuery.isError) {
    return <ErrorState error={signalQuery.error} onRetry={() => signalQuery.refetch()} />;
  }

  const signal = signalQuery.data;
  if (!signal) {
    return null;
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div>
        <Space wrap>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {signal.title}
          </Typography.Title>
          <Tag>{sideLabels[signal.side]}</Tag>
        </Space>
        <Typography.Text type="secondary">{signal.code}</Typography.Text>
      </div>

      <Card>
        <Typography.Paragraph style={{ marginBottom: 8 }}>{signal.summary}</Typography.Paragraph>
        <Divider style={{ margin: '12px 0' }} />
        <Typography.Text strong>Как схема работает</Typography.Text>
        <Typography.Paragraph style={{ marginTop: 8 }}>{signal.description}</Typography.Paragraph>
      </Card>

      <Card title="Как распознать">
        <List
          dataSource={signal.how_to_recognize}
          renderItem={(item) => (
            <List.Item>
              <Typography.Text>{item}</Typography.Text>
            </List.Item>
          )}
        />
      </Card>

      <Card title="Как действовать">
        <Typography.Paragraph style={{ marginBottom: 0 }}>{signal.how_to_act}</Typography.Paragraph>
      </Card>

      {signal.related_scenarios?.length ? (
        <Card title="В каких сценариях отрабатывается">
          <List
            dataSource={signal.related_scenarios}
            renderItem={(scenario) => (
              <List.Item>
                <Link to="/" state={{ scenarioCode: scenario.code }}>
                  {scenario.title}
                </Link>
                <Tag>{difficultyLabel(scenario.difficulty)}</Tag>
              </List.Item>
            )}
          />
        </Card>
      ) : null}
    </Space>
  );
}
