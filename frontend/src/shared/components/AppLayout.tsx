import { BookOutlined, LogoutOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';

const { Header, Content, Footer } = Layout;

/** Каркас приложения: шапка с навигацией и состоянием авторизации. */
export function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/signals',
      icon: <BookOutlined />,
      label: <Link to="/signals">Справочник</Link>,
    },
  ];

  const selectedKeys = location.pathname.startsWith('/signals') ? ['/signals'] : [];

  const handleSignOut = () => {
    void signOut().then(() => navigate('/'));
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-brand">
            <Space>
              <SafetyCertificateOutlined />
              <Typography.Text strong className="app-brand-title">
                Антискам тренажёр
              </Typography.Text>
            </Space>
          </Link>
          <Space size="middle" className="app-header-actions">
            <Menu
              mode="horizontal"
              items={menuItems}
              selectedKeys={selectedKeys}
              className="app-menu"
            />
            {user ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: 'Выйти',
                      onClick: handleSignOut,
                    },
                  ],
                }}
              >
                <Button type="text">
                  <Space>
                    <Avatar size="small">{user.nickname.slice(0, 1).toUpperCase()}</Avatar>
                    {user.nickname}
                  </Space>
                </Button>
              </Dropdown>
            ) : (
              <Space size="small">
                <Link to="/login">
                  <Button type="text">Войти</Button>
                </Link>
                <Link to="/register">
                  <Button type="primary">Регистрация</Button>
                </Link>
              </Space>
            )}
          </Space>
        </div>
      </Header>
      <Content className="app-content">
        <Outlet />
      </Content>
      <Footer className="app-footer">
        Антискам тренажёр · учебный проект: учимся распознавать признаки мошенничества до того, как
        сделка станет рискованной.
      </Footer>
    </Layout>
  );
}
