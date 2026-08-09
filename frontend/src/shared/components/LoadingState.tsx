import { Spin } from 'antd';

export function LoadingState({ text = 'Загрузка…' }: { text?: string }) {
  return (
    <div className="state-block">
      <Spin tip={text} size="large">
        <div style={{ width: 240, height: 80 }} />
      </Spin>
    </div>
  );
}
