import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAvailableProjects, getMyBids } from '../../services/projectApi';

export default function ContractorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.first_name || 'there';
  const [projects, setProjects] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [projResult, bidResult] = await Promise.all([getAvailableProjects(), getMyBids()]);
      if (projResult.success) {
        setProjects(projResult.data.projects || []);
        if (projResult.data.filters?.city) setCityFilter(projResult.data.filters.city);
      }
      if (bidResult.success) setBids(bidResult.data.bids || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const wonBids = bids.filter(b => b.status === 'accepted').length;

  const stats = [
    { label: 'Available Jobs', value: projects.length.toString(), icon: '📋', color: '#2563eb' },
    { label: 'My Bids', value: bids.length.toString(), icon: '💼', color: '#7c3aed' },
    { label: 'Jobs Won', value: wonBids.toString(), icon: '🏆', color: '#059669' },
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
          <button onClick={() => navigate('/profile')} style={{ fontSize: 13, fontWeight: 500, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>My Profile</button>
          <button onClick={() => navigate('/catalogs')} style={{ fontSize: 13, fontWeight: 500, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>My Catalogs</button>
          <span style={{ fontSize: 14, color: '#64748b' }}>{user?.email}</span>
          <button onClick={logout} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Welcome, {firstName} 🔨</h1>
            <p style={{ fontSize: 15, color: '#64748b' }}>
              {cityFilter && cityFilter !== 'All Areas' ? `Showing jobs in ${cityFilter}` : 'Showing all available jobs.'}
              {cityFilter === 'All Areas' && <span style={{ fontSize: 13, color: '#2563eb', cursor: 'pointer', marginLeft: 8 }} onClick={() => navigate('/profile')}>Set your service area &rarr;</span>}
            </p>
          </div>
          <button onClick={() => navigate('/jobs')} style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
            Browse All Jobs
          </button>
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

        {/* Latest Projects in your city */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
          {cityFilter ? `Jobs in ${cityFilter}` : 'Latest Available Jobs'}
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Loading jobs...</div>
        ) : projects.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, padding: 32, border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 14, color: '#94a3b8' }}>No jobs available in your area yet. Check back soon!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.slice(0, 10).map((p: any) => (
              <div key={p.id} onClick={() => navigate(`/jobs?project=${p.id}`)}
                style={{ background: 'white', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{p.title}</h3>
                  <p style={{ fontSize: 13, color: '#94a3b8' }}>
                    {p.category || 'General'} &middot; {p.location_address || 'Location hidden'} &middot; {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {p.bid_floor && (
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>${Number(p.bid_floor).toLocaleString()} - ${Number(p.bid_ceiling).toLocaleString()}</p>
                  )}
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>View & Bid &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
