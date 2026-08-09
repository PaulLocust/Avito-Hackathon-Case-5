import { Card, Space, Tag, Typography } from 'antd';

import { formatDateTime, formatPercent } from '../../entities/format';
import { roleLabel } from '../../entities/labels';
import type { ScenarioCard } from '../../api/types';
import { DifficultyTag } from '../../shared/components/DifficultyTag';
import { LevelTag } from '../../shared/components/LevelTag';

interface ScenarioCardProps {
  scenario: ScenarioCard;
  showProgress: boolean;
  onSelect: (code: string) => void;
}

/** Карточка сценария на витрине (FR5–FR7). */
export function ScenarioCardItem({ scenario, showProgress, onSelect }: ScenarioCardProps) {
  const progressFields =
    typeof scenario.best_percent === 'number' && scenario.best_level ? (
      <Space size={4}>
        Лучший результат: {formatPercent(scenario.best_percent)}
        <LevelTag level={scenario.best_level} />
      </Space>
    ) : showProgress && scenario.attempted ? (
      <Typography.Text type="secondary">Результатов пока нет</Typography.Text>
    ) : null;

  return (
    <Card hoverable onClick={() => onSelect(scenario.code)} className="scenario-card">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Typography.Title level={5} style={{ margin: 0 }}>
          {scenario.title}
        </Typography.Title>
        <Space size={4} wrap>
          <Tag>{roleLabel(scenario.role)}</Tag>
          <DifficultyTag difficulty={scenario.difficulty} />
          <Tag>≈ {scenario.steps_count} шагов</Tag>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          {scenario.description}
        </Typography.Paragraph>
        {scenario.last_attempt_at ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Последняя попытка: {formatDateTime(scenario.last_attempt_at)}
          </Typography.Text>
        ) : null}
        {progressFields}
      </Space>
    </Card>
  );
}
