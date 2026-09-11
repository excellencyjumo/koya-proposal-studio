import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  demoMode: boolean;
  credentialsHint: any;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  isLoginModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('koya_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('koya_token'));
  const [demoMode, setDemoMode] = useState<boolean>(true);
  const [credentialsHint, setCredentialsHint] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    api.getAuthContext()
      .then((ctx) => {
        setDemoMode(ctx.demo_mode);
        setCredentialsHint(ctx.credentials_hint);
      })
      .catch(() => {});
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    localStorage.setItem('koya_token', res.accessToken);
    localStorage.setItem('koya_user', JSON.stringify(res.user));
    setToken(res.accessToken);
    setUser(res.user);
    setIsLoginModalOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('koya_token');
    localStorage.removeItem('koya_user');
    setToken(null);
    setUser(null);
  };

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        demoMode,
        credentialsHint,
        login,
        logout,
        openLoginModal,
        closeLoginModal,
        isLoginModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
