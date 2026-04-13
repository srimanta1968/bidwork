import { useState, useEffect } from 'react';
import { getUsers, getUserStats, updateUserStatus } from '../services/adminApi';

const TABS = [
  { key: 'homeowner', label: 'Homeowners' },
  { key: 'contractor', label: 'Contractors' },
  { key: 'skilled_labor', label: 'Skilled Labor' },
];

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('homeowner');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadUsers(); }, [activeTab, page, search]);

  const loadStats = async () => {
    try { const r = await getUserStats(); if (r.success) setStats(r.data.stats || {}); } catch {}
  };

  const loadUsers = async () => {
    setLoading(true);
    try { const r = await getUsers({ role: activeTab, search, page, limit: 20 }); if (r.success) setUsers(r.data.users || []); } catch {}
    finally { setLoading(false); }
  };

  const toggleStatus = async (userId: string, currentActive: boolean) => {
    try {
      await updateUserStatus(userId, !currentActive);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_email_verified: !currentActive } : u));
    } catch {}
  };

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>User Management</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {TABS.map(t => (
          <div key={t.key} style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{t.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#0f172a' }}>{stats[t.key] || 0}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
            style={{ padding: '8px 20px', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', background: activeTab === t.key ? '#2563eb' : '#f1f5f9', color: activeTab === t.key ? 'white' : '#475569' }}>
            {t.label}
          </button>
        ))}
        <input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 'auto', padding: '8px 16px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, width: 250 }} />
      </div>
      {loading ? <p style={{ color: '#64748b', padding: 24 }}>Loading...</p> : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Joined</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{u.first_name} {u.last_name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, color: '#64748b' }}>{u.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: u.is_email_verified ? '#ecfdf5' : '#fef2f2', color: u.is_email_verified ? '#059669' : '#dc2626' }}>
                      {u.is_email_verified ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => toggleStatus(u.id, u.is_email_verified)}
                      style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: u.is_email_verified ? '#fef2f2' : '#ecfdf5', color: u.is_email_verified ? '#dc2626' : '#059669' }}>
                      {u.is_email_verified ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No users found.</p>}
        </div>
      )}
    </div>
  );
}
