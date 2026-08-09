import { ArrowRightOutlined } from '@ant-design/icons';
import { Button, Card, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';

import type { ProgressResponse } from '../../api/types';

interface ContinueCardProps {
  progress: ProgressResponse;
}

/** Блок «продолжить» для прерванной тренировки на главной (FR12, USR7). */
export function ContinueCard({ progress }: ContinueCardProps) {
  const activeSession = progress.active_session;
  if (!activeSession) {
    return null;
  }

  return (
    <Card className="continue-card">
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Typography.Text strong>Продолжить тренировку</Typography.Text>
        <Typography.Text>
          {activeSession.scenario.title} · шаг {activeSession.answers_count + 1} из{' '}
          {activeSession.steps_total}
        </Typography.Text>
        <Space>
          <Link to={`/session/${activeSession.session_id}`}>
            <Button type="primary" icon={<ArrowRightOutlined />}>
              Продолжить
            </Button>
          </Link>
        </Space>
      </Space>
    </Card>
  );
}
