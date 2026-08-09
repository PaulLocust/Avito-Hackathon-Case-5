import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';

import { outcomeLabel } from '../../entities/labels';
import type { Outcome } from '../../api/types';

const outcomeConfig: Record<Outcome, { color: string; icon: React.ReactNode }> = {
  safe: { color: 'green', icon: <CheckCircleOutlined /> },
  risky: { color: 'orange', icon: <ExclamationCircleOutlined /> },
  critical: { color: 'red', icon: <CloseCircleOutlined /> },
};

/** Визуальное различение последствий выбора: безопасно / спорно / опасно (FR17). */
export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const config = outcomeConfig[outcome];
  return (
    <Tag color={config.color} icon={config.icon}>
      {outcomeLabel(outcome)}
    </Tag>
  );
}
