import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function decodeBase64Url(s: string): string {
  const pad = (4 - (s.length % 4)) % 4;
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return atob(base64);
}

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const err = params.get('error');
    const token = params.get('token');
    const userParam = params.get('user');
    if (err) { setError(decodeURIComponent(err)); return; }
    if (!token || !userParam) { setError('Missing OAuth response data'); return; }
    try {
      const user = JSON.parse(decodeBase64Url(userParam));
      login(user, token);
      // Honor the same routing the password flow uses: contractor/skilled-labor
      // hit onboarding first if they haven't onboarded; homeowner goes
      // straight to /dashboard.
      const needsOnboarding = (user.role === 'contractor' || user.role === 'skilled_labor') && !user.is_onboarded;
      navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Failed to read OAuth response');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 440, background: 'white', border: '1px solid #fecaca', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>Sign-in failed</h2>
          <p style={{ fontSize: 14, color: '#7f1d1d', marginBottom: 16 }}>{error}</p>
          <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>← Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: 14, color: '#64748b' }}>Signing you in…</p>
    </div>
  );
}
