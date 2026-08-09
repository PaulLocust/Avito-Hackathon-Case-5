import { Alert, Button, Form, Input, Typography } from 'antd';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { register } from '../../api/auth';
import { ApiError } from '../../entities/apiError';
import { useAuth } from '../../features/auth/useAuth';

interface RegisterFormValues {
  nickname: string;
  password: string;
  confirm: string;
}

export function RegisterPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<unknown>(null);
  const [form] = Form.useForm<RegisterFormValues>();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleFinish = async (values: RegisterFormValues) => {
    try {
      const response = await register({
        nickname: values.nickname,
        password: values.password,
      });
      signIn(response);
      navigate(from, { replace: true });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'validation_error' && error.details?.fields) {
        const fieldErrors = Object.entries(error.details.fields as Record<string, unknown>).map(
          ([name, message]) => ({
            name: name as keyof RegisterFormValues,
            errors: [String(message)],
          }),
        );
        form.setFields(fieldErrors);
        return;
      }
      setFormError(error);
    }
  };

  return (
    <div className="auth-page">
      <Typography.Title level={3}>Регистрация</Typography.Title>
      <Typography.Paragraph type="secondary">
        Прогресс и история попыток привязаны к учётной записи.
      </Typography.Paragraph>

      {formError instanceof ApiError ? (
        <Alert type="error" showIcon message={formError.message} style={{ marginBottom: 16 }} />
      ) : null}

      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark="optional">
        <Form.Item
          name="nickname"
          label="Ник"
          rules={[
            { required: true, message: 'Придумайте ник' },
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
          rules={[
            { required: true, message: 'Придумайте пароль' },
            { min: 8, max: 72, message: 'Пароль — от 8 до 72 символов' },
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Пароль ещё раз"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Повторите пароль' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Пароли не совпадают'));
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Зарегистрироваться
        </Button>
      </Form>
    </div>
  );
}
