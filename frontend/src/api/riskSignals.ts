import { apiGet } from './client';
import type { RiskSignalDetail, RiskSignalListResponse, Side } from './types';

export function listRiskSignals(side?: Side): Promise<RiskSignalListResponse> {
  return apiGet<RiskSignalListResponse>('/risk-signals', {
    params: side ? { side } : undefined,
  });
}

export function getRiskSignal(signalCode: string): Promise<RiskSignalDetail> {
  return apiGet<RiskSignalDetail>(`/risk-signals/${encodeURIComponent(signalCode)}`);
}
