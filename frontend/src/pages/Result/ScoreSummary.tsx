import { ArrowDownOutlined, ArrowUpOutlined, MinusOutlined } from '@ant-design/icons';
import { Alert, Card, Space, Statistic, Typography } from 'antd';

import type { AttemptComparison, ScoreSummary as ScoreSummaryType } from '../../api/types';
import { formatDeltaPercent, formatDateTime, formatPercent } from '../../entities/format';
import { LevelTag } from '../../shared/components/LevelTag';

/** Оценка прохождения: балл, уровень, сравнение с предыдущей попыткой (FR20–FR23). */
export function ScoreSummary({
  score,
  comparison,
}: {
  score: ScoreSummaryType;
  comparison: AttemptComparison | null | undefined;
}) {
  return (
    <Card>
      <Space size="large" wrap align="center">
        <Statistic
          title="Результат"
          value={score.percent}
          suffix="%"
          valueStyle={{ color: '#1677ff' }}
        />
        <Space direction="vertical" size={4}>
          <Space>
            <Typography.Text strong>Уровень:</Typography.Text>
            <LevelTag level={score.level} />
          </Space>
          <Typography.Text type="secondary">
            Балл: {score.score} (от {score.min_score} до {score.max_score}) · выборов:{' '}
            {score.answers_count}
          </Typography.Text>
        </Space>
      </Space>

      {comparison ? (
        <ComparisonNotice comparison={comparison} />
      ) : (
        <Typography.Text type="secondary">Это ваша первая попытка по сценарию.</Typography.Text>
      )}
    </Card>
  );
}

function ComparisonNotice({ comparison }: { comparison: AttemptComparison }) {
  const { delta_percent, previous_percent, previous_finished_at } = comparison;
  const icon =
    delta_percent > 0 ? (
      <ArrowUpOutlined />
    ) : delta_percent < 0 ? (
      <ArrowDownOutlined />
    ) : (
      <MinusOutlined />
    );
  const type = delta_percent > 0 ? 'success' : delta_percent < 0 ? 'warning' : 'info';

  return (
    <Alert
      style={{ marginTop: 16 }}
      type={type}
      showIcon
      icon={icon}
      message={`Результат ${formatDeltaPercent(delta_percent)} к прошлой попытке`}
      description={`В прошлый раз было ${formatPercent(previous_percent)} (${formatDateTime(previous_finished_at)}).`}
    />
  );
}
