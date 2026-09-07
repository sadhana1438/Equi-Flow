'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Project } from '@/types';
import { api } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLeader: boolean;
  login: (email: string, pass: string) => Promise<Project | null | undefined>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    is_leader?: boolean;
    daily_capacity?: number;
    join_code?: string;
  }) => Promise<Project | null | undefined>;
  logout: () => void;
  joinProjectByCode: (code: string) => Promise<Project>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('equiflow_auth');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.user && parsed.token) {
          setUser(parsed.user);
          setToken(parsed.token);
        }
      }
    } catch (e) {
      console.error('Failed restoring auth session:', e);
    }
  }, []);

  const saveSession = (u: User, t: string) => {
    setUser(u);
    setToken(t);
    localStorage.setItem('equiflow_auth', JSON.stringify({ user: u, token: t }));
  };

  const login = async (email: string, pass: string) => {
    const res = await api.login({ email, password: pass });
    if (res.success) {
      saveSession(res.user, res.token);
      return res.active_project;
    }
    return null;
  };

  const signup = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    is_leader?: boolean;
    daily_capacity?: number;
    join_code?: string;
  }) => {
    const res = await api.signup(data);
    if (res.success) {
      saveSession(res.user, res.token);
      return res.active_project;
    }
    return null;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('equiflow_auth');
  };

  const joinProjectByCode = async (code: string): Promise<Project> => {
    if (!user) throw new Error('Please sign in first to join a project.');
    const res = await api.joinProject({ join_code: code, user_id: user.id });
    return res.project;
  };

  const isLeader = Boolean(
    (user as any)?.is_leader ||
    user?.role?.toLowerCase().includes('lead') ||
    user?.role?.toLowerCase().includes('manager') ||
    user?.role?.toLowerCase().includes('architect')
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLeader,
        login,
        signup,
        logout,
        joinProjectByCode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
