import { createContext, useContext } from 'react';
import type { AuthUser } from './session';

export interface AuthContextValue {
  /** The signed-in staff member, or null. Restored from the browser on load, then confirmed with the server. */
  user: AuthUser | null;
  signIn(phoneNumber: string, password: string): Promise<AuthUser>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  signOut(): Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
