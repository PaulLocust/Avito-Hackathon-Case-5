import { Alert, Button, Form, Input, Typography } from 'antd';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { login } from '../../api/auth';
import { ApiError } from '../../entities/apiError';
import { useAuth } from '../../features/auth/useAuth';

interface LoginFormValues {
  nickname: string;
  password: string;
}

export function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<unknown>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleFinish = async (values: LoginFormValues) => {
    try {
      const response = await login({ nickname: values.nickname, password: values.password });
      signIn(response);
      navigate(from, { replace: true });
    } catch (error) {
      setFormError(error);
    }
  };

  return (
    <div className="auth-page">
      <Typography.Title level={3}>Вход</Typography.Title>
      <Typography.Paragraph type="secondary">
        Нет учётной записи? <Link to="/register">Зарегистрируйтесь</Link> — прогресс сохраняется
        между попытками.
      </Typography.Paragraph>

      {formError instanceof ApiError ? (
        <Alert type="error" showIcon message={formError.message} style={{ marginBottom: 16 }} />
      ) : null}

      <Form layout="vertical" onFinish={handleFinish} requiredMark="optional">
        <Form.Item
          name="nickname"
          label="Ник"
          rules={[
            { required: true, message: 'Введите ник' },
            {
              pattern: /^[a-zA-Z0-9_-]{3,32}$/,
              message: '3–32 символа: латинские буквы, цифры, дефис или подчёркивание',
            },
          ]}
        >
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Пароль"
          rules={[{ required: true, message: 'Введите пароль' }]}
        >
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Войти
        </Button>
      </Form>
    </div>
  );
}
