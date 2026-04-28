interface Props {
  intent: 'signup' | 'login';
  role?: 'homeowner' | 'contractor' | 'skilled_labor';
  disabled?: boolean;
}

const env = (import.meta as any).env || {};
const googleEnabled = String(env.VITE_OAUTH_GOOGLE_ENABLED || 'true') === 'true';
const linkedinEnabled = String(env.VITE_OAUTH_LINKEDIN_ENABLED || 'true') === 'true';

function startUrl(provider: 'google' | 'linkedin', intent: Props['intent'], role?: Props['role']): string {
  const params = new URLSearchParams({ intent });
  if (role) params.set('role', role);
  return `/api/auth/oauth/${provider}/start?${params.toString()}`;
}

export default function OAuthButtons({ intent, role, disabled }: Props) {
  if (!googleEnabled && !linkedinEnabled) return null;

  const go = (provider: 'google' | 'linkedin') => {
    if (disabled) return;
    window.location.href = startUrl(provider, intent, role);
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', fontSize: 14, fontWeight: 600,
    background: 'white', color: '#0f172a',
    border: '1px solid #e2e8f0', borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background 0.15s',
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {googleEnabled && (
          <button type="button" onClick={() => go('google')} disabled={disabled} style={buttonStyle}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.7 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.7 6.1 29.6 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2.1 14.1-5.5l-6.5-5.5c-2 1.4-4.6 2.3-7.6 2.3-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.5 39.4 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 4.9l6.5 5.5c-.5.4 6.9-5 6.9-14.4 0-1.3-.1-2.4-.4-3.5z"/>
            </svg>
            <span>{intent === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
          </button>
        )}
        {linkedinEnabled && (
          <button type="button" onClick={() => go('linkedin')} disabled={disabled} style={buttonStyle}
            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; }}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#0A66C2" d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.3 6.5a1.78 1.78 0 0 1-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-2-1.65-2A1.94 1.94 0 0 0 12.5 14a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z"/>
            </svg>
            <span>{intent === 'signup' ? 'Sign up with LinkedIn' : 'Continue with LinkedIn'}</span>
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        <span style={{ fontSize: 12, color: '#94a3b8' }}>or</span>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>
    </div>
  );
}
