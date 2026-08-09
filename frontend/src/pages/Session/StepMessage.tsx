import { LinkOutlined, PaperClipOutlined, PictureOutlined } from '@ant-design/icons';
import { Card, Space, Typography } from 'antd';

import { senderLabels } from '../../entities/labels';
import type { StepContent, StepView } from '../../api/types';

const attachmentIcons = {
  link: <LinkOutlined />,
  screenshot: <PictureOutlined />,
  document: <PaperClipOutlined />,
} as const;

/** Реплика шага и вложения. Ссылки в контенте — имитация и не кликабельны (SEC8). */
export function StepMessage({ step }: { step: StepView }) {
  const content = step.content;
  return (
    <div className="chat-list">
      <div className={`chat-bubble chat-bubble--${content.sender ?? 'counterparty'}`}>
        {content.sender ? (
          <div className="chat-sender-label">{senderLabels[content.sender]}</div>
        ) : null}
        {content.message}
      </div>
      {content.context ? (
        <div className="chat-bubble chat-bubble--narrator">
          <div className="chat-sender-label">Контекст</div>
          {content.context}
        </div>
      ) : null}
      {content.attachment ? <AttachmentCard content={content} /> : null}
    </div>
  );
}

function AttachmentCard({ content }: { content: StepContent }) {
  const attachment = content.attachment;
  if (!attachment) {
    return null;
  }
  return (
    <Card size="small" className="chat-bubble chat-bubble--narrator">
      <Space size={8}>
        {attachmentIcons[attachment.kind] ?? <PaperClipOutlined />}
        <Typography.Text code>{attachment.caption}</Typography.Text>
      </Space>
    </Card>
  );
}
