import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import BillingsPage from './pages/BillingsPage';
import RulesPage from './pages/RulesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ServiceFeePage from './pages/ServiceFeePage';
import ProvidersSetupPage from './pages/ProvidersSetupPage';
import FeedbackPage from './pages/FeedbackPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/users', label: 'Users', icon: '👥' },
  { path: '/billings', label: 'Billings', icon: '💳' },
  { path: '/providers', label: 'Providers Setup', icon: '🤖' },
  { path: '/feedback', label: 'Feedback', icon: '💬' },
  { path: '/service-fee', label: 'Service Fee', icon: '💰' },
  { path: '/rules', label: 'Bid Rules', icon: '⚙️' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
];

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAdminAuth();
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: '#0f172a', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 16 }}>B</div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>BidWork</p>
              <p style={{ fontSize: 11, color: '#64748b' }}>Admin Portal</p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', fontSize: 14, fontWeight: 500, color: isActive ? 'white' : '#94a3b8', background: isActive ? 'rgba(37, 99, 235, 0.2)' : 'transparent', textDecoration: 'none', borderLeft: isActive ? '3px solid #2563eb' : '3px solid transparent', transition: 'all 0.2s' }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e293b' }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{user?.email}</p>
          <button onClick={logout} style={{ width: '100%', padding: '8px', fontSize: 13, fontWeight: 500, color: '#94a3b8', background: '#1e293b', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, background: '#f8fafc', padding: 32, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAdminAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><AdminLayout><DashboardPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><AdminLayout><UsersPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/billings" element={<ProtectedRoute><AdminLayout><BillingsPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/subscriptions" element={<Navigate to="/billings" replace />} />
      <Route path="/providers" element={<ProtectedRoute><AdminLayout><ProvidersSetupPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/rules" element={<ProtectedRoute><AdminLayout><RulesPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/service-fee" element={<ProtectedRoute><AdminLayout><ServiceFeePage /></AdminLayout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><AdminLayout><AnalyticsPage /></AdminLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  // In prod we live under https://bidwork.projexlight.com/admin/ so the router
  // needs to know its base path. In dev (vite at :3001) the BASE_URL is "/" so
  // basename collapses to undefined.
  const baseUrl = import.meta.env.BASE_URL || '/';
  const basename = baseUrl.replace(/\/$/, '') || undefined;
  return (
    <BrowserRouter basename={basename}>
      <AdminAuthProvider>
        <AppRoutes />
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
