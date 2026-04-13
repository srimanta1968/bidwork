import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { adminLogin } from '../services/adminApi';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await adminLogin(email, password);
      if (result.success) { login(result.data.user, result.data.token); navigate('/dashboard'); }
      else setError(result.error || 'Login failed');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 400, background: 'white', borderRadius: 16, padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 20, marginBottom: 12 }}>B</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>BidWork Admin</h1>
          <p style={{ fontSize: 14, color: '#64748b' }}>Sign in to manage the platform</p>
        </div>
        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, color: '#dc2626', fontSize: 14, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '12px 16px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '12px 16px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', background: loading ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
