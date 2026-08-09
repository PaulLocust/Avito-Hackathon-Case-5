import { Tag } from 'antd';

import { difficultyLabel } from '../../entities/labels';
import type { Difficulty } from '../../api/types';

const difficultyColors: Record<Difficulty, string> = {
  basic: 'blue',
  advanced: 'purple',
  demo: 'default',
};

export function DifficultyTag({ difficulty }: { difficulty: Difficulty }) {
  return <Tag color={difficultyColors[difficulty]}>{difficultyLabel(difficulty)}</Tag>;
}
