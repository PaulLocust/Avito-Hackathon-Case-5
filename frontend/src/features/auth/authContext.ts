import { createContext } from 'react';

import type { AuthResponse, User } from '../../api/types';

export interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  signIn: (response: AuthResponse) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
