import { useState, FormEvent, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/authService';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = params.get('token');
    if (!t) {
      setError('Missing reset token. Please request a new password-reset email.');
    } else {
      setToken(t);
    }
  }, [params]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      if (result.success) {
        setDone(true);
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch { setError('An unexpected error occurred'); }
    finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', fontSize: 15, border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none', color: '#0f172a', background: '#f8fafc', transition: 'border-color 0.2s' };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 24 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 15 }}>B</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>BidWork</span>
          </Link>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Choose a new password</h1>
          <p style={{ fontSize: 15, color: '#64748b' }}>Your email will be re-verified automatically.</p>
        </div>

        <div style={{ background: 'white', borderRadius: 16, padding: 36, border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          {error && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14, marginBottom: 20 }}>{error}</div>}

          {done ? (
            <div style={{ padding: 16, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, color: '#047857', fontSize: 14, lineHeight: 1.6 }}>
              Password updated. Redirecting you to sign in…
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>New password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="At least 8 characters" style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                  Min 8 chars, with upper + lower case, a number, and a special character.
                </p>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Confirm password</label>
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="Re-enter password" style={inputStyle}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')} onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')} />
              </div>
              <button type="submit" disabled={loading || !token}
                style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading || !token ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 2px 10px rgba(37,99,235,0.3)' }}>
                {loading ? 'Updating...' : 'Reset password'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 14, color: '#64748b', marginTop: 24 }}>
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>&larr; Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
