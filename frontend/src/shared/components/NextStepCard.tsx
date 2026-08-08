import { Alert, Button, Typography } from 'antd';
import { Link } from 'react-router-dom';

import type { NextStepSuggestion } from '../../api/types';

interface NextStepCardProps {
  suggestion: NextStepSuggestion;
  onScenarioSelect?: (code: string) => void;
}

/** Предложение следующего шага обучения (FR27). */
export function NextStepCard({ suggestion, onScenarioSelect }: NextStepCardProps) {
  if (suggestion.type === 'all_done') {
    return (
      <Alert
        type="success"
        showIcon
        message="Все сценарии пройдены"
        description={suggestion.reason}
      />
    );
  }

  if (suggestion.type === 'explore_signals') {
    return (
      <Alert
        type="info"
        showIcon
        message="Следующий шаг: справочник признаков"
        description={suggestion.reason}
        action={
          <Link to="/signals">
            <Button size="small">Открыть справочник</Button>
          </Link>
        }
      />
    );
  }

  const scenario = suggestion.scenario;
  const handleOpen = () => {
    if (scenario) {
      onScenarioSelect?.(scenario.code);
    }
  };

  const action = scenario ? (
    onScenarioSelect ? (
      <Button size="small" type="primary" onClick={handleOpen}>
        Открыть сценарий
      </Button>
    ) : (
      <Link to="/" state={{ scenarioCode: scenario.code }}>
        <Button size="small" type="primary">
          Открыть сценарий
        </Button>
      </Link>
    )
  ) : undefined;

  return (
    <Alert
      type="info"
      showIcon
      message={
        scenario ? (
          <Typography.Text>Рекомендуем: «{scenario.title}»</Typography.Text>
        ) : (
          'Следующий шаг обучения'
        )
      }
      description={suggestion.reason}
      action={action}
    />
  );
}
