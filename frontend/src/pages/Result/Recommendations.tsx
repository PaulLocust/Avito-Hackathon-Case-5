import { Card, List, Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';

/** Практические рекомендации, применимые к реальной сделке (FR19). */
export function Recommendations({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }
  return (
    <Card title="Рекомендации">
      <List
        dataSource={items}
        renderItem={(item) => (
          <List.Item>
            <Typography.Text>
              <SafetyCertificateOutlined /> {item}
            </Typography.Text>
          </List.Item>
        )}
      />
    </Card>
  );
}
