import { apiGet } from './client';
import type { ProgressResponse, SignalProgressResponse } from './types';

export function getProgress(): Promise<ProgressResponse> {
  return apiGet<ProgressResponse>('/progress');
}

export function getSignalProgress(): Promise<SignalProgressResponse> {
  return apiGet<SignalProgressResponse>('/progress/signals');
}
