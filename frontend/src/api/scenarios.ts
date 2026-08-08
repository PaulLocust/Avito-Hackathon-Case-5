import { apiGet } from './client';
import type { AttemptListResponse, Role, ScenarioDetail, ScenarioListResponse } from './types';

export function listScenarios(role?: Role): Promise<ScenarioListResponse> {
  return apiGet<ScenarioListResponse>('/scenarios', { params: role ? { role } : undefined });
}

export function getScenario(scenarioCode: string): Promise<ScenarioDetail> {
  return apiGet<ScenarioDetail>(`/scenarios/${encodeURIComponent(scenarioCode)}`);
}

export function listScenarioAttempts(scenarioCode: string): Promise<AttemptListResponse> {
  return apiGet<AttemptListResponse>(`/scenarios/${encodeURIComponent(scenarioCode)}/attempts`);
}
