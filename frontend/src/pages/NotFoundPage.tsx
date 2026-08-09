import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="404"
      subTitle="Такой страницы нет."
      extra={
        <Link to="/">
          <Button type="primary">На главную</Button>
        </Link>
      }
    />
  );
}
