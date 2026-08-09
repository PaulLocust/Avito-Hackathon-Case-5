import { Card, Divider, List, Space, Tag, Typography } from 'antd';

import type { AnswerResult } from '../../api/types';
import { formatDeltaScore } from '../../entities/scoreFormat';
import { OutcomeBadge } from '../../shared/components/OutcomeBadge';
import { RiskSignalLink } from '../../shared/components/RiskSignalLink';

/**
 * Обучающая обратная связь после выбора: признак → причина → альтернатива (USR4, FR15).
 */
export function FeedbackCard({ answer }: { answer: AnswerResult }) {
  return (
    <Card
      className="feedback-card"
      styles={{ header: { borderBottom: 0 } }}
      title={
        <Space wrap>
          <OutcomeBadge outcome={answer.outcome} />
          <Typography.Text type="secondary">{formatDeltaScore(answer.score_delta)}</Typography.Text>
        </Space>
      }
    >
      <Typography.Paragraph style={{ marginBottom: answer.safe_alternative ? 12 : 0 }}>
        {answer.feedback}
      </Typography.Paragraph>

      {answer.safe_alternative ? (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Typography.Text strong>Безопасная альтернатива</Typography.Text>
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            {answer.safe_alternative.text} — {answer.safe_alternative.feedback}
          </Typography.Paragraph>
        </>
      ) : null}

      {answer.risk_signals.length > 0 ? (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Typography.Text strong>Признаки риска на этом шаге</Typography.Text>
          <List
            size="small"
            dataSource={answer.risk_signals}
            renderItem={(signal) => (
              <List.Item>
                <RiskSignalLink signal={signal} />
              </List.Item>
            )}
          />
        </>
      ) : null}

      {answer.already_answered ? (
        <Tag style={{ marginTop: 8 }}>Вы уже отвечали на этом шаге — результат сохранён</Tag>
      ) : null}
    </Card>
  );
}
