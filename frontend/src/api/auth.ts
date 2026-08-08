import { apiGet, apiPost } from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from './types';

export function register(body: RegisterRequest): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/register', body);
}

export function login(body: LoginRequest): Promise<AuthResponse> {
  return apiPost<AuthResponse>('/auth/login', body);
}

export function logout(): Promise<void> {
  return apiPost<void>('/auth/logout', undefined);
}

export function getCurrentUser(): Promise<User> {
  return apiGet<User>('/auth/me');
}
