import { Button, Space } from 'antd';

import type { OptionView } from '../../api/types';

interface OptionListProps {
  options: OptionView[];
  disabled: boolean;
  onSelect: (option: OptionView) => void;
}

/** Ровно три варианта действия на шаге (USR2: очевидно, какое действие ожидается). */
export function OptionList({ options, disabled, onSelect }: OptionListProps) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {options.map((option) => (
        <Button
          key={option.code}
          block
          size="large"
          disabled={disabled}
          onClick={() => onSelect(option)}
          style={{ height: 'auto', whiteSpace: 'normal', textAlign: 'left', padding: '12px 16px' }}
        >
          {option.text}
        </Button>
      ))}
    </Space>
  );
}
