import { useState, useEffect } from 'react';
import { getUsers, getUserStats, updateUserStatus, sendUserEmail } from '../services/adminApi';

const TABS = [
  { key: 'homeowner', label: 'Homeowners' },
  { key: 'contractor', label: 'Contractors' },
  { key: 'skilled_labor', label: 'Skilled Labor' },
];

interface EmailTarget {
  id: string;
  email: string;
  name: string;
}

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState('homeowner');
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Send-personal-email modal
  const [emailTarget, setEmailTarget] = useState<EmailTarget | null>(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadUsers(); }, [activeTab, page, search]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

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

  const openEmailModal = (u: any) => {
    setEmailTarget({
      id: u.id,
      email: u.email,
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
    });
    setEmailSubject('');
    setEmailBody('');
  };

  const closeEmailModal = () => {
    setEmailTarget(null);
    setEmailSubject('');
    setEmailBody('');
  };

  const sendEmail = async () => {
    if (!emailTarget) return;
    if (!emailSubject.trim() || !emailBody.trim()) return;
    setEmailSending(true);
    try {
      const r = await sendUserEmail(emailTarget.id, { subject: emailSubject, body: emailBody });
      if (r.success) {
        setToast({ kind: 'success', text: `Email sent to ${emailTarget.email}` });
        setTimeout(() => closeEmailModal(), 1000);
      } else {
        setToast({ kind: 'error', text: r.error || 'Failed to send email' });
      }
    } catch (e: any) {
      setToast({ kind: 'error', text: e?.message || 'Failed to send email' });
    } finally {
      setEmailSending(false);
    }
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
                    <button onClick={() => openEmailModal(u)}
                      style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#1d4ed8', marginRight: 8 }}>
                      Send Email
                    </button>
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

      {emailTarget && (
        <div onClick={closeEmailModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 14, width: 'min(560px, 92vw)', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Send Email</h2>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>To <strong>{emailTarget.name}</strong> · {emailTarget.email}</p>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>To</label>
            <input value={emailTarget.email} readOnly
              style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 14, background: '#f8fafc', color: '#64748b', boxSizing: 'border-box' }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>Subject</label>
            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject"
              style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, marginBottom: 14, boxSizing: 'border-box' }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>Body</label>
            <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6} placeholder="Write your message…"
              style={{ width: '100%', padding: '8px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, marginBottom: 20, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeEmailModal} disabled={emailSending}
                style={{ padding: '9px 18px', fontSize: 14, fontWeight: 600, color: '#475569', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={sendEmail}
                disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                style={{
                  padding: '9px 18px', fontSize: 14, fontWeight: 600, color: 'white', background: '#4f46e5',
                  border: 'none', borderRadius: 8,
                  cursor: emailSending || !emailSubject.trim() || !emailBody.trim() ? 'not-allowed' : 'pointer',
                  opacity: emailSending || !emailSubject.trim() || !emailBody.trim() ? 0.6 : 1,
                }}>
                {emailSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 10,
          background: toast.kind === 'success' ? '#ecfdf5' : '#fef2f2',
          color: toast.kind === 'success' ? '#047857' : '#b91c1c',
          border: `1px solid ${toast.kind === 'success' ? '#a7f3d0' : '#fecaca'}`,
          fontSize: 14, fontWeight: 500, zIndex: 1000, maxWidth: 420,
        }}>{toast.text}</div>
      )}
    </div>
  );
}
