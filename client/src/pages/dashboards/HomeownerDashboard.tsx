import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMyProjects } from '../../services/projectApi';

export default function HomeownerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.first_name || 'there';
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const result = await getMyProjects();
      if (result.success) setProjects(result.data.projects || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const activeCount = projects.filter(p => ['draft', 'bidding', 'assigned', 'in_progress'].includes(p.status)).length;
  const biddingCount = projects.filter(p => p.status === 'bidding').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  const stats = [
    { label: 'Active Projects', value: activeCount.toString(), icon: '📋', color: '#2563eb' },
    { label: 'Accepting Bids', value: biddingCount.toString(), icon: '💰', color: '#7c3aed' },
    { label: 'Completed', value: completedCount.toString(), icon: '✅', color: '#059669' },
  ];

  const statusLabel = (p: any) => {
    if (p.scope_status === 'failed') return { text: 'Failed', bg: '#fef2f2', color: '#dc2626' };
    if (['classifying', 'generating_scope', 'calculating_bids'].includes(p.scope_status)) return { text: 'AI Processing...', bg: '#eff6ff', color: '#2563eb' };
    if (p.scope_status === 'complete' && !p.is_approved) return { text: 'Review Scope', bg: '#fefce8', color: '#ca8a04' };
    if (p.status === 'bidding') return { text: 'Accepting Bids', bg: '#ecfdf5', color: '#059669' };
    if (p.status === 'assigned') return { text: 'Contractor Assigned', bg: '#f0fdf4', color: '#16a34a' };
    return { text: p.status || 'Draft', bg: '#f8fafc', color: '#64748b' };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: 'white', borderBottom: '1px solid #f1f5f9', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14 }}>B</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>BidWork</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: '#64748b' }}>{user?.email}</span>
          <button onClick={logout} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Welcome back, {firstName} 👋</h1>
            <p style={{ fontSize: 15, color: '#64748b' }}>Here's an overview of your home projects.</p>
          </div>
          <button onClick={() => navigate('/projects/new')}
            style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', display: 'flex', alignItems: 'center', gap: 8 }}>
            + New Project
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
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

        {/* Projects List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Loading projects...</div>
        ) : projects.length === 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <div style={{ background: 'white', borderRadius: 14, padding: 32, border: '1px solid #f1f5f9', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📸</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Start a New Project</h3>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Upload photos of your home project and let AI scope the work.</p>
              <button onClick={() => navigate('/projects/new')} style={{ padding: '12px 28px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
                Upload Photos
              </button>
            </div>
            <div style={{ background: 'white', borderRadius: 14, padding: 32, border: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Recent Activity</h3>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏡</div>
                <p style={{ fontSize: 14, color: '#94a3b8' }}>No projects yet. Upload photos to get started!</p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>Your Projects</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {projects.map((p: any) => {
                const sl = statusLabel(p);
                return (
                  <div key={p.id} onClick={() => {
                    if (p.status === 'bidding') navigate(`/projects/${p.id}/bids`);
                    else navigate(`/projects/${p.id}`);
                  }}
                    style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{p.title}</h3>
                        <span style={{ fontSize: 12, fontWeight: 600, color: sl.color, background: sl.bg, padding: '2px 10px', borderRadius: 20 }}>{sl.text}</span>
                      </div>
                      <p style={{ fontSize: 13, color: '#94a3b8' }}>
                        {p.category || 'Uncategorized'} &middot; {p.quality_tier || 'standard'} &middot; {new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {p.bid_floor && (
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>${Number(p.bid_floor).toLocaleString()} - ${Number(p.bid_ceiling).toLocaleString()}</p>
                      )}
                      {p.status === 'draft' && (
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.id}/edit`); }}
                          style={{ padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer' }}>
                          Continue
                        </button>
                      )}
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>&rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
