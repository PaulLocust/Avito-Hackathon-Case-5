import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Card, List, Space, Tag, Typography } from 'antd';

import type { SessionSignalOutcome } from '../../api/types';
import { sideLabels } from '../../entities/labels';
import { RiskSignalLink } from '../../shared/components/RiskSignalLink';

/** Карта распознанных и пропущенных признаков риска (FR18, FR26). */
export function SignalMap({ signals }: { signals: SessionSignalOutcome[] }) {
  return (
    <Card title="Признаки риска в этом сценарии">
      <List
        dataSource={signals}
        renderItem={(signal) => {
          const recognized = signal.recognized;
          return (
            <List.Item>
              <Space wrap>
                {recognized ? (
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                ) : (
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                )}
                <RiskSignalLink signal={signal} />
                <Tag>{sideLabels[signal.side]}</Tag>
                <Typography.Text type="secondary">
                  распознано на {signal.steps_recognized} из {signal.steps_total} шагов
                </Typography.Text>
                <Tag color={recognized ? 'green' : 'red'}>
                  {recognized ? 'распознан' : 'пропущен'}
                </Tag>
              </Space>
            </List.Item>
          );
        }}
      />
    </Card>
  );
}
