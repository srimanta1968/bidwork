import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
];

export function MarketingNav() {
  const { isAuthenticated, user, logout } = useAuth();
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 15 }}>B</div>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>BidWork</span>
        </Link>
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} style={{ fontSize: 14, fontWeight: 500, color: '#475569', textDecoration: 'none' }}>{l.label}</Link>
          ))}
          {isAuthenticated ? (
            <>
              <span style={{ fontSize: 14, color: '#64748b' }}>Hi, {user?.first_name || user?.email?.split('@')[0]}</span>
              <button onClick={logout} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: '#475569', padding: '9px 18px', textDecoration: 'none', borderRadius: 8 }}>Sign in</Link>
              <Link to="/register" style={{ fontSize: 14, fontWeight: 600, color: 'white', padding: '9px 22px', textDecoration: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 1px 3px rgba(37,99,235,0.3)' }}>Get started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc', paddingTop: 56, paddingBottom: 32 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, marginBottom: 40 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 13 }}>B</div>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>BidWork</span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, maxWidth: 260 }}>
              The operating system for home services execution — AI-scoped jobs, transparent bidding, escrowed deposits, and contractor-issued receipts.
            </p>
          </div>
          <FooterColumn title="Product" links={[
            { to: '/#features', label: 'Features' },
            { to: '/#how-it-works', label: 'How it works' },
            { to: '/register', label: 'Sign up' },
            { to: '/login', label: 'Sign in' },
          ]} />
          <FooterColumn title="Company" links={[
            { to: '/about', label: 'About' },
            { to: '/contact', label: 'Contact' },
            { to: '/faq', label: 'FAQ' },
          ]} />
          <FooterColumn title="Legal" links={[
            { to: '/terms', label: 'Terms of Service' },
            { to: '/privacy', label: 'Privacy Policy' },
          ]} />
        </div>
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>&copy; {year} BidWork, Inc. All rights reserved.</p>
          <p style={{ fontSize: 13, color: '#cbd5e1' }}>AI understands the job. Humans refine. Pricing is bounded. Contractors bid informed.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>{title}</h4>
      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {links.map(l => (
          <li key={l.to}>
            <Link to={l.to} style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <MarketingNav />
      <main style={{ paddingTop: 92 }}>{children}</main>
      <MarketingFooter />
    </div>
  );
}

export function PageHeader({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string }) {
  return (
    <section style={{ background: 'linear-gradient(180deg, #f8fafc, white)', padding: '64px 24px 48px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {kicker && <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{kicker}</p>}
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: 1.15, marginBottom: 16 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 17, color: '#64748b', lineHeight: 1.6 }}>{subtitle}</p>}
      </div>
    </section>
  );
}

export const proseStyle: React.CSSProperties = {
  maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px',
  fontSize: 16, lineHeight: 1.75, color: '#334155',
};
