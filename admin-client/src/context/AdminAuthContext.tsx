import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminUser { id: string; email: string; first_name: string | null; last_name: string | null; role: string; }
interface AdminAuthContextType { user: AdminUser | null; token: string | null; isAuthenticated: boolean; login: (user: AdminUser, token: string) => void; logout: () => void; }

const AdminAuthContext = createContext<AdminAuthContextType>({ user: null, token: null, isAuthenticated: false, login: () => {}, logout: () => {} });

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('bidwork_admin_token');
    const savedUser = localStorage.getItem('bidwork_admin_user');
    if (savedToken && savedUser) { setToken(savedToken); setUser(JSON.parse(savedUser)); }
  }, []);

  const login = (u: AdminUser, t: string) => {
    setUser(u); setToken(t);
    localStorage.setItem('bidwork_admin_token', t);
    localStorage.setItem('bidwork_admin_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('bidwork_admin_token');
    localStorage.removeItem('bidwork_admin_user');
  };

  return (
    <AdminAuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
