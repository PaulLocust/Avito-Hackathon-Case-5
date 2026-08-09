import { Tag } from 'antd';
import type { ReactNode } from 'react';

import { securityLevelLabel } from '../../entities/labels';
import type { SecurityLevel } from '../../api/types';

const levelColors: Record<SecurityLevel, string> = {
  resilient: 'green',
  attentive: 'gold',
  vulnerable: 'red',
};

interface LevelTagProps {
  level: SecurityLevel;
  prefix?: ReactNode;
}

export function LevelTag({ level, prefix }: LevelTagProps) {
  return (
    <Tag color={levelColors[level]}>
      {prefix}
      {securityLevelLabel(level)}
    </Tag>
  );
}
