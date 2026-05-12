import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function decodeBase64Url(s: string): string {
  const pad = (4 - (s.length % 4)) % 4;
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return atob(base64);
}

const PROVIDER_LABEL: Record<string, string> = {
  google: 'Google',
  linkedin: 'LinkedIn',
};

interface ErrorView {
  title: string;
  body: string;
  primary?: { label: string; to: string };
  secondary?: { label: string; to: string };
}

function buildErrorView(rawCode: string, providerSlug: string | null): ErrorView {
  const code = decodeURIComponent(rawCode);
  const providerLabel = providerSlug ? PROVIDER_LABEL[providerSlug] || providerSlug : 'this provider';

  if (code === 'no_account_for_identity') {
    return {
      title: 'No BidWork account yet',
      body: `We couldn't find a BidWork account linked to your ${providerLabel} sign-in. If you're new here, create an account first — you'll pick your role and we'll link your ${providerLabel} account in one step.`,
      primary: { label: 'Create an account', to: '/register' },
      secondary: { label: 'Back to sign in', to: '/login' },
    };
  }
  if (code === 'unsupported_provider') {
    return {
      title: 'Unsupported sign-in provider',
      body: 'That sign-in provider is not enabled. Please use another option.',
      secondary: { label: 'Back to sign in', to: '/login' },
    };
  }
  if (code === 'missing_code_or_state' || code.startsWith('OAuth state')) {
    return {
      title: 'Sign-in could not be completed',
      body: 'The sign-in attempt expired or was interrupted. Please try again.',
      secondary: { label: 'Back to sign in', to: '/login' },
    };
  }
  return {
    title: 'Sign-in failed',
    body: code,
    secondary: { label: 'Back to sign in', to: '/login' },
  };
}

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [view, setView] = useState<ErrorView | null>(null);

  useEffect(() => {
    const err = params.get('error');
    const providerSlug = params.get('provider');
    const token = params.get('token');
    const userParam = params.get('user');
    if (err) { setView(buildErrorView(err, providerSlug)); return; }
    if (!token || !userParam) {
      setView(buildErrorView('Missing OAuth response data', providerSlug));
      return;
    }
    try {
      const user = JSON.parse(decodeBase64Url(userParam));
      login(user, token);
      const needsOnboarding = (user.role === 'contractor' || user.role === 'skilled_labor') && !user.is_onboarded;
      navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
    } catch (e: any) {
      setView(buildErrorView(e?.message || 'Failed to read OAuth response', providerSlug));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (view) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 460, background: 'white', border: '1px solid #fecaca', borderRadius: 12, padding: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#991b1b', marginBottom: 10 }}>{view.title}</h2>
          <p style={{ fontSize: 14, lineHeight: 1.55, color: '#7f1d1d', marginBottom: 22 }}>{view.body}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {view.primary && (
              <Link
                to={view.primary.to}
                style={{
                  display: 'block', textAlign: 'center', padding: '11px 16px',
                  background: '#2563eb', color: 'white', fontWeight: 600,
                  borderRadius: 10, textDecoration: 'none', fontSize: 14,
                }}
              >
                {view.primary.label}
              </Link>
            )}
            {view.secondary && (
              <Link
                to={view.secondary.to}
                style={{
                  display: 'block', textAlign: 'center', padding: '10px 16px',
                  color: '#2563eb', fontWeight: 600, textDecoration: 'none', fontSize: 14,
                }}
              >
                ← {view.secondary.label}
              </Link>
            )}
          </div>
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
