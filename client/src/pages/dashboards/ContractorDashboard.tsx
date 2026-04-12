import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ContractorDashboard() {
  const { user, logout } = useAuth();
  const firstName = user?.first_name || 'there';

  const stats = [
    { label: 'Available Jobs', value: '0', icon: '📋', color: '#2563eb' },
    { label: 'My Bids', value: '0', icon: '💼', color: '#7c3aed' },
    { label: 'Jobs Won', value: '0', icon: '🏆', color: '#059669' },
    { label: 'Profile Views', value: '0', icon: '👁️', color: '#f59e0b' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: 'white', borderBottom: '1px solid #f1f5f9', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14 }}>B</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>BidWork</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'white', background: '#059669', padding: '4px 10px', borderRadius: 20 }}>Contractor</span>
          <span style={{ fontSize: 14, color: '#64748b' }}>{user?.email}</span>
          <button onClick={logout} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Welcome, {firstName} 🔨</h1>
          <p style={{ fontSize: 15, color: '#64748b' }}>Find pre-scoped jobs and submit competitive bids.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>{s.label}</span>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Available Jobs */}
          <div style={{ background: 'white', borderRadius: 14, padding: 32, border: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Available Jobs</h3>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <p style={{ fontSize: 14, color: '#94a3b8' }}>No jobs available yet. Check back soon — homeowners are scoping projects now.</p>
            </div>
          </div>

          {/* My Bids */}
          <div style={{ background: 'white', borderRadius: 14, padding: 32, border: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>My Bids</h3>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>💼</div>
              <p style={{ fontSize: 14, color: '#94a3b8' }}>No bids submitted yet. Browse available jobs to start bidding.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
