import { Progress, Space, Typography } from 'antd';

import { formatPercent } from '../../entities/format';
import type { ProgressResponse } from '../../api/types';
import { LevelTag } from '../../shared/components/LevelTag';

/** Строка прогресса главной страницы (FR25). */
export function ProgressRow({ progress }: { progress: ProgressResponse }) {
  const { completed_scenarios, total_scenarios, attempts_count, best_percent, best_level } =
    progress;

  return (
    <Space direction="vertical" size={0} style={{ width: '100%' }}>
      <Typography.Text>
        Пройдено {completed_scenarios} из {total_scenarios} сценариев · попыток: {attempts_count}
      </Typography.Text>
      <Progress
        percent={Math.round((completed_scenarios / Math.max(total_scenarios, 1)) * 100)}
        showInfo={false}
      />
      <Typography.Text type="secondary">
        Лучший результат:{' '}
        {typeof best_percent === 'number' && best_level ? (
          <Space size={4}>
            {formatPercent(best_percent)} <LevelTag level={best_level} />
          </Space>
        ) : (
          'ещё нет — начните с первого сценария'
        )}
      </Typography.Text>
    </Space>
  );
}
