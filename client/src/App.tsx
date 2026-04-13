import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nProvider';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import OnboardingPage from './pages/OnboardingPage';
import HomeownerDashboard from './pages/dashboards/HomeownerDashboard';
import ContractorDashboard from './pages/dashboards/ContractorDashboard';
import SkilledLaborDashboard from './pages/dashboards/SkilledLaborDashboard';
import CreateProjectPage from './pages/projects/CreateProjectPage';
import ScopeReviewPage from './pages/projects/ScopeReviewPage';
import AvailableJobsPage from './pages/projects/AvailableJobsPage';
import BidComparisonPage from './pages/projects/BidComparisonPage';
import EditProjectPage from './pages/projects/EditProjectPage';
import CatalogPage from './pages/projects/CatalogPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if ((user.role === 'contractor' || user.role === 'skilled_labor') && !user.is_onboarded) return <Navigate to="/onboarding" replace />;
  switch (user.role) {
    case 'contractor': return <ContractorDashboard />;
    case 'skilled_labor': return <SkilledLaborDashboard />;
    default: return <HomeownerDashboard />;
  }
}

function OnboardingGuard() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.is_onboarded) return <Navigate to="/dashboard" replace />;
  if (user.role === 'homeowner') return <Navigate to="/dashboard" replace />;
  return <OnboardingPage />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/verify-email" element={<ProtectedRoute><VerifyEmailPage /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingGuard /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
      <Route path="/projects/new" element={<ProtectedRoute><CreateProjectPage /></ProtectedRoute>} />
      <Route path="/projects/:id" element={<ProtectedRoute><ScopeReviewPage /></ProtectedRoute>} />
      <Route path="/projects/:id/edit" element={<ProtectedRoute><EditProjectPage /></ProtectedRoute>} />
      <Route path="/projects/:id/bids" element={<ProtectedRoute><BidComparisonPage /></ProtectedRoute>} />
      <Route path="/jobs" element={<ProtectedRoute><AvailableJobsPage /></ProtectedRoute>} />
      <Route path="/catalogs" element={<ProtectedRoute><CatalogPage /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}

export default App;
