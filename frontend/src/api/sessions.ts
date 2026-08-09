import { apiGet, apiPost } from './client';
import type {
  AnswerResult,
  SessionResult,
  SessionState,
  StartSessionRequest,
  SubmitAnswerRequest,
} from './types';

export function startSession(body: StartSessionRequest): Promise<SessionState> {
  return apiPost<SessionState>('/sessions', body);
}

export function getSession(sessionId: string): Promise<SessionState> {
  return apiGet<SessionState>(`/sessions/${sessionId}`);
}

export function submitAnswer(sessionId: string, body: SubmitAnswerRequest): Promise<AnswerResult> {
  return apiPost<AnswerResult>(`/sessions/${sessionId}/answers`, body);
}

export function getSessionResult(sessionId: string): Promise<SessionResult> {
  return apiGet<SessionResult>(`/sessions/${sessionId}/result`);
}

export function abandonSession(sessionId: string): Promise<void> {
  return apiPost<void>(`/sessions/${sessionId}/abandon`, undefined);
}
