import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getToken, getUser, setToken, setUser, clearAuth } from '../services/authService';

interface UserData {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: UserData, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUserState] = useState<UserData | null>(null);
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = getToken();
    const savedUser = getUser();
    if (savedToken && savedUser) {
      setTokenState(savedToken);
      setUserState(savedUser);
    }
  }, []);

  const login = (userData: UserData, authToken: string): void => {
    setToken(authToken);
    setUser(userData);
    setTokenState(authToken);
    setUserState(userData);
  };

  const logout = (): void => {
    clearAuth();
    setTokenState(null);
    setUserState(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
