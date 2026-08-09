import { Alert, Button, Space } from 'antd';

import { errorMessage } from '../utils/errorMessage';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** Явное визуальное представление состояния ошибки запроса (USR6). */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <Alert
      className="state-block"
      type="error"
      showIcon
      message="Что-то пошло не так"
      description={errorMessage(error)}
      action={
        onRetry ? (
          <Space>
            <Button size="small" onClick={onRetry}>
              Повторить
            </Button>
          </Space>
        ) : undefined
      }
    />
  );
}
