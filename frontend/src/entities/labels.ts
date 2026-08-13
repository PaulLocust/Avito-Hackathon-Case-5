import type {
  Difficulty,
  MessageSender,
  Outcome,
  Role,
  SecurityLevel,
  SessionStatus,
  Side,
} from '../api/types';

/** Человекочитаемые названия уровней безопасности (FR21). */
export const securityLevelLabels: Record<SecurityLevel, string> = {
  resilient: 'Устойчив',
  attentive: 'Внимателен',
  vulnerable: 'Уязвим',
};

/** Описание уровня для подсказки на экране результата. */
export const securityLevelDescriptions: Record<SecurityLevel, string> = {
  resilient: '80–100% — вы уверенно распознаёте риск и действуете безопасно.',
  attentive: '60–79% — вы замечаете большинство рисков, но часть схем ещё пропускаете.',
  vulnerable: '0–59% — схемы мошенников пока срабатывают; стоит пройти сценарий ещё раз.',
};

export const difficultyLabels: Record<Difficulty, string> = {
  basic: 'Базовый',
  advanced: 'Продвинутый',
  demo: 'Демо',
};

export const outcomeLabels: Record<Outcome, string> = {
  safe: 'Безопасно',
  risky: 'Спорно',
  critical: 'Опасно',
};

export const roleLabels: Record<Role, string> = {
  buyer: 'Покупатель',
  seller: 'Продавец',
};

export const sideLabels: Record<Side, string> = {
  buyer: 'Покупатель',
  seller: 'Продавец',
};

export const senderLabels: Record<MessageSender, string> = {
  counterparty: 'Контрагент',
  platform: 'Платформа',
  narrator: 'Ведущий',
};

export const sessionStatusLabels: Record<SessionStatus, string> = {
  in_progress: 'В процессе',
  paused: 'На паузе',
  completed: 'Завершена',
  abandoned: 'Прервана',
};

export const signalStatusLabels: Record<string, string> = {
  mastered: 'Распознаётся уверенно',
  weak: 'Регулярно пропускается',
  unknown: 'Ещё не встречался',
};

export function securityLevelLabel(level: SecurityLevel): string {
  return securityLevelLabels[level];
}

export function difficultyLabel(difficulty: Difficulty): string {
  return difficultyLabels[difficulty];
}

export function outcomeLabel(outcome: Outcome): string {
  return outcomeLabels[outcome];
}

export function roleLabel(role: Role): string {
  return roleLabels[role];
}
