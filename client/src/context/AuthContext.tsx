import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserData, getToken, getUser, setToken, setUser, clearAuth } from '../services/authService';

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: UserData, token: string) => void;
  logout: () => void;
  updateUser: (user: UserData) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const updateUser = (userData: UserData): void => {
    setUser(userData);
    setUserState(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token && !!user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
