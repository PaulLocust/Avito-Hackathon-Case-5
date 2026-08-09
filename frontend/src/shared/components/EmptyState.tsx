import { Empty } from 'antd';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  description: string;
  children?: ReactNode;
}

/** Пустой список с действием, если оно уместно (USR6). */
export function EmptyState({ description, children }: EmptyStateProps) {
  return (
    <Empty description={description} image={Empty.PRESENTED_IMAGE_SIMPLE} className="state-block">
      {children}
    </Empty>
  );
}
