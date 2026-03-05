import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthState, User } from '../types';
import { authApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  validateMfa: (code: string) => Promise<void>;
  logout: () => void;
}

function decodeJwt(token: string): User | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    return {
      id: payload.id || payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    mfaRequired: false,
    preAuthToken: null,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = decodeJwt(token);
      if (user) {
        setState({ user, token, isAuthenticated: true, mfaRequired: false, preAuthToken: null });
        connectSocket(token);
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login(email, password);
    const data = response.data;

    if (data.mfa_required) {
      setState((prev) => ({ ...prev, mfaRequired: true, preAuthToken: data.pre_auth_token }));
    } else {
      const token: string = data.token;
      const user = decodeJwt(token);
      localStorage.setItem('token', token);
      connectSocket(token);
      setState({ user, token, isAuthenticated: true, mfaRequired: false, preAuthToken: null });
    }
  }, []);

  const validateMfa = useCallback(async (code: string) => {
    if (!state.preAuthToken) throw new Error('No pre-auth token');
    const response = await authApi.validateMfa(state.preAuthToken, code);
    const token: string = response.data.token;
    const user = decodeJwt(token);
    localStorage.setItem('token', token);
    connectSocket(token);
    setState({ user, token, isAuthenticated: true, mfaRequired: false, preAuthToken: null });
  }, [state.preAuthToken]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    disconnectSocket();
    setState({ user: null, token: null, isAuthenticated: false, mfaRequired: false, preAuthToken: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, validateMfa, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
