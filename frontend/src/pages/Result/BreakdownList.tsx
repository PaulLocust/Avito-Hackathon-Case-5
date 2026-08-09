import { Card, Collapse, Divider, List, Space, Typography } from 'antd';

import type { BreakdownItem } from '../../api/types';
import { formatDeltaScore } from '../../entities/scoreFormat';
import { OutcomeBadge } from '../../shared/components/OutcomeBadge';
import { RiskSignalLink } from '../../shared/components/RiskSignalLink';

/** Пошаговый разбор решений с безопасными альтернативами (FR18). */
export function BreakdownList({ items }: { items: BreakdownItem[] }) {
  return (
    <Card title="Разбор решений">
      <Collapse
        items={items.map((item) => ({
          key: item.step_code,
          label: `Шаг ${item.order} · ${item.chosen.outcome === 'safe' ? 'безопасно' : item.chosen.outcome === 'risky' ? 'спорно' : 'опасно'}`,
          children: (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Typography.Text type="secondary">Ситуация</Typography.Text>
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {item.situation}
                </Typography.Paragraph>
              </div>
              <div>
                <Typography.Text type="secondary">Ваш выбор</Typography.Text>
                <Space wrap>
                  <OutcomeBadge outcome={item.chosen.outcome} />
                  <Typography.Text>{item.chosen.text}</Typography.Text>
                  <Typography.Text type="secondary">
                    {formatDeltaScore(item.chosen.score_delta)}
                  </Typography.Text>
                </Space>
                <Typography.Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
                  {item.chosen.feedback}
                </Typography.Paragraph>
              </div>
              {item.safe_alternative ? (
                <div>
                  <Typography.Text strong>Безопасная альтернатива</Typography.Text>
                  <Typography.Paragraph style={{ marginBottom: 0 }}>
                    {item.safe_alternative.text} — {item.safe_alternative.feedback}
                  </Typography.Paragraph>
                </div>
              ) : null}
              {item.risk_signals.length > 0 ? (
                <>
                  <Divider style={{ margin: '4px 0' }} />
                  <List
                    size="small"
                    dataSource={item.risk_signals}
                    renderItem={(signal) => (
                      <List.Item>
                        <RiskSignalLink signal={signal} />
                      </List.Item>
                    )}
                  />
                </>
              ) : null}
            </Space>
          ),
        }))}
      />
    </Card>
  );
}
