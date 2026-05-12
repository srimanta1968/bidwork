import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import LanguageSwitcher from '../components/common/LanguageSwitcher';
import { MarketingFooter } from '../components/common/MarketingLayout';

/* ═══════════════════════ NAVBAR ═══════════════════════ */
function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useI18n();
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 15 }}>B</div>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>BidWork</span>
        </Link>

        <div style={{ display: 'none', gap: 28, alignItems: 'center' }} className="md:!flex">
          <a href="#features" style={{ fontSize: 14, fontWeight: 500, color: '#64748b', textDecoration: 'none' }}>{t.features.label}</a>
          <a href="#how-it-works" style={{ fontSize: 14, fontWeight: 500, color: '#64748b', textDecoration: 'none' }}>{t.howItWorks.label}</a>
          <Link to="/about" style={{ fontSize: 14, fontWeight: 500, color: '#64748b', textDecoration: 'none' }}>About</Link>
          <Link to="/faq" style={{ fontSize: 14, fontWeight: 500, color: '#64748b', textDecoration: 'none' }}>FAQ</Link>
          <Link to="/contact" style={{ fontSize: 14, fontWeight: 500, color: '#64748b', textDecoration: 'none' }}>Contact</Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LanguageSwitcher />
          {isAuthenticated ? (
            <>
              <span style={{ fontSize: 14, color: '#64748b', marginRight: 8 }}>Hi, {user?.first_name || user?.email?.split('@')[0]}</span>
              <button onClick={logout} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px' }}>{t.nav.logout}</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: '#475569', padding: '9px 20px', textDecoration: 'none', borderRadius: 8 }}>{t.nav.signIn}</Link>
              <Link to="/register" style={{ fontSize: 14, fontWeight: 600, color: 'white', padding: '9px 22px', textDecoration: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 1px 3px rgba(37,99,235,0.3)' }}>{t.nav.getStarted}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════ HERO ═══════════════════════ */
function Hero() {
  const { t } = useI18n();
  return (
    <section style={{ paddingTop: 140, paddingBottom: 80, background: '#ffffff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.04) 0%, transparent 60%)' }} />
      <div style={{ position: 'relative', maxWidth: 880, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <h1 className="animate-fade-up" style={{ fontSize: 'clamp(36px, 5.5vw, 62px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: 24 }}>
          {t.hero.headline1}{' '}
          <span className="gradient-text">{t.hero.headline2}</span>
        </h1>
        <p className="animate-fade-up-delay" style={{ fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.7, color: '#64748b', maxWidth: 640, margin: '0 auto 40px', fontWeight: 400 }}>
          {t.hero.subtitle}
        </p>
        <div className="animate-fade-up-delay2" style={{ display: 'flex', flexWrap: 'wrap', gap: 48, justifyContent: 'center', marginBottom: 64 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Homeowners</p>
            <Link to="/register" style={{ fontSize: 16, fontWeight: 600, color: 'white', padding: '14px 28px', textDecoration: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 220, boxSizing: 'border-box' }}>
              Start a project
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#059669', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Contractors &amp; skilled workers</p>
            <Link to="/register" style={{ fontSize: 16, fontWeight: 600, color: 'white', padding: '14px 28px', textDecoration: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #059669, #0891b2)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 220, boxSizing: 'border-box' }}>
              Sign up free
            </Link>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
          {[
            { value: '3x', label: t.stats.faster },
            { value: '40%', label: t.stats.rework },
            { value: '$0', label: t.stats.started },
            { value: '100%', label: t.stats.clarity },
          ].map((stat, i) => (
            <div key={stat.value} style={{ padding: '16px 40px', textAlign: 'center', borderLeft: i > 0 ? '1px solid #e2e8f0' : 'none' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{stat.value}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ FEATURES ═══════════════════════ */
function FeaturesGrid() {
  const { t } = useI18n();
  const features = [
    { icon: '📸', title: t.features.photoUpload, desc: t.features.photoUploadDesc },
    { icon: '🤖', title: t.features.aiScope, desc: t.features.aiScopeDesc },
    { icon: '✏️', title: t.features.editableList, desc: t.features.editableListDesc },
    { icon: '💰', title: t.features.bidRange, desc: t.features.bidRangeDesc },
    { icon: '👷', title: t.features.vettedContractors, desc: t.features.vettedContractorsDesc },
    { icon: '📋', title: t.features.photoDocs, desc: t.features.photoDocsDesc },
  ];

  return (
    <section id="features" style={{ padding: '96px 0', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t.features.label}</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 16 }}>{t.features.title}</h2>
          <p style={{ fontSize: 17, color: '#64748b', maxWidth: 560, margin: '0 auto' }}>{t.features.subtitle}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {features.map((f) => (
            <div key={f.title} style={{ background: 'white', borderRadius: 14, padding: 32, border: '1px solid #f1f5f9', transition: 'all 0.3s ease', cursor: 'default' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#64748b' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */
function HowItWorks() {
  const { t } = useI18n();
  const steps = [
    { num: '1', title: t.howItWorks.step1, desc: t.howItWorks.step1Desc, color: '#2563eb' },
    { num: '2', title: t.howItWorks.step2, desc: t.howItWorks.step2Desc, color: '#7c3aed' },
    { num: '3', title: t.howItWorks.step3, desc: t.howItWorks.step3Desc, color: '#0891b2' },
    { num: '4', title: t.howItWorks.step4, desc: t.howItWorks.step4Desc, color: '#059669' },
  ];

  return (
    <section id="how-it-works" style={{ padding: '96px 0', background: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t.howItWorks.label}</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 16 }}>{t.howItWorks.title}</h2>
          <p style={{ fontSize: 17, color: '#64748b', maxWidth: 560, margin: '0 auto' }}>{t.howItWorks.subtitle}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 32 }}>
          {steps.map((s) => (
            <div key={s.num} style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: `${s.color}10`, border: `2px solid ${s.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 22, fontWeight: 800, color: s.color }}>{s.num}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>{s.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#64748b' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ FOR WHO ═══════════════════════ */
function ForWho() {
  const { t } = useI18n();
  const CheckItem = ({ text, color }: { text: string; color: string }) => (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <svg width="12" height="12" fill={color} viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
      </div>
      <span style={{ fontSize: 15, color: '#475569', lineHeight: 1.5 }}>{text}</span>
    </li>
  );

  return (
    <section style={{ padding: '96px 0', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#059669', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t.forWho.label}</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{t.forWho.title}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 28 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 40, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24 }}>🏠</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{t.forWho.homeownerTitle}</h3>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>{t.forWho.homeownerDesc}</p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <CheckItem text={t.forWho.h1} color="#2563eb" />
              <CheckItem text={t.forWho.h2} color="#2563eb" />
              <CheckItem text={t.forWho.h3} color="#2563eb" />
              <CheckItem text={t.forWho.h4} color="#2563eb" />
            </ul>
          </div>
          <div style={{ background: 'white', borderRadius: 16, padding: 40, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24 }}>🔨</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>{t.forWho.contractorTitle}</h3>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>{t.forWho.contractorDesc}</p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <CheckItem text={t.forWho.c1} color="#059669" />
              <CheckItem text={t.forWho.c2} color="#059669" />
              <CheckItem text={t.forWho.c3} color="#059669" />
              <CheckItem text={t.forWho.c4} color="#059669" />
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ TESTIMONIALS ═══════════════════════ */
function Testimonials() {
  const { t } = useI18n();
  const reviews = [
    { text: "BidWork completely changed how I approach home projects. I knew exactly what I was paying for before the first contractor showed up.", name: 'Sarah M.', role: 'Homeowner, Austin TX', color: '#2563eb' },
    { text: "As a contractor, I love that jobs come pre-scoped. I see the photos, the task list, and the budget — and I bid with confidence.", name: 'Marcus J.', role: 'General Contractor', color: '#059669' },
    { text: "The bid range feature is brilliant. I got three bids, all within range, and chose based on reviews and timeline instead of just price.", name: 'Rachel K.', role: 'Homeowner, Portland OR', color: '#7c3aed' },
  ];

  return (
    <section style={{ padding: '96px 0', background: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{t.testimonials.label}</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{t.testimonials.title}</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          {reviews.map((r) => (
            <div key={r.name} style={{ background: '#f8fafc', borderRadius: 16, padding: 32, border: '1px solid #f1f5f9', transition: 'all 0.3s' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                {[1,2,3,4,5].map((i) => (
                  <svg key={i} width="16" height="16" fill="#f59e0b" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: '#475569', marginBottom: 24 }}>"{r.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${r.color}, ${r.color}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>{r.name[0]}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ CTA ═══════════════════════ */
function CTA() {
  const { t } = useI18n();
  return (
    <section style={{ padding: '96px 0', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ borderRadius: 24, padding: '72px 40px', textAlign: 'center', background: 'linear-gradient(135deg, #1e3a8a, #4f46e5, #0e7490)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'radial-gradient(ellipse at top right, white, transparent 60%)' }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 }}>
              {t.cta.title}
            </h2>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.6 }}>
              {t.cta.subtitle}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
              <Link to="/register" style={{ fontSize: 16, fontWeight: 700, padding: '14px 36px', background: 'white', color: '#1e3a8a', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
                {t.cta.primary}
              </Link>
              <Link to="/register" style={{ fontSize: 16, fontWeight: 600, padding: '14px 36px', background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, textDecoration: 'none' }}>
                {t.cta.secondary}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ TRUST & SAFETY ═══════════════════════ */
function TrustSafety() {
  const items = [
    { icon: '🔒', title: 'Privacy by default', body: 'Your address and contact info are hidden from contractors until you accept a bid. No one sees other contractors\' bids.' },
    { icon: '✍️', title: 'Mutual e-signed contracts', body: 'Every engagement is recorded in a work order signed by both parties with IP and timestamp. We retain the audit trail for 7 years.' },
    { icon: '💳', title: 'Escrowed deposit', body: 'The 5% platform fee is held by BidWork until both parties sign. If a contractor abandons, the deposit becomes a credit on your project — not a loss.' },
    { icon: '🚩', title: 'Public abandonment flags', body: 'Contractors who fail to honor accepted offers get a visible flag on their profile so future homeowners can factor reliability into their selection.' },
    { icon: '🤖', title: 'AI scoping, human refined', body: 'Every project is scoped by AI from your photos, then you review and edit before publishing. Pricing is bounded by a per-task floor.' },
    { icon: '📑', title: 'Receipts for both sides', body: 'BidWork issues a service-fee receipt to you. The contractor issues a final payment receipt with their own legal company name. Two documents, one paper trail.' },
  ];
  return (
    <section style={{ padding: '96px 0', background: '#0f172a', color: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#7dd3fc', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Trust &amp; safety</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', marginBottom: 16 }}>Built so both sides can act in good faith</h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', maxWidth: 640, margin: '0 auto' }}>
            BidWork is opinionated about privacy, accountability, and paper trails — not because it sounds nice, but because every dispute we've seen in home services traces back to one of those three things.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {items.map(it => (
            <div key={it.title} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(125,211,252,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>{it.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 6 }}>{it.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ FAQ TEASER ═══════════════════════ */
function FaqTeaser() {
  const items = [
    { q: 'Is it free to start a project?', a: 'Yes. Sign-up, AI scoping, and bid review are free. The 5% platform fee is collected as a deposit only when you select a contractor.' },
    { q: 'How is privacy handled?', a: 'Contractors never see homeowner email/phone/address before a bid is accepted. Other contractors never see competing bids.' },
    { q: 'What if a contractor doesn\'t respond?', a: 'After 72 working hours of no response, the bid auto-abandons, the contractor\'s profile is flagged, and your deposit becomes a credit on your project.' },
    { q: 'Who sees the final payment receipt?', a: 'Both parties. The receipt is issued by the contractor\'s legal company (not BidWork) — we render the document but the seller is the contractor.' },
  ];
  return (
    <section style={{ padding: '96px 0', background: 'white' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0891b2', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Frequently asked</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Quick answers</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
          {items.map(it => (
            <div key={it.q} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{it.q}</p>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7 }}>{it.a}</p>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link to="/faq" style={{ fontSize: 15, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>See all FAQs (Homeowner · Contractor · Skilled Worker) →</Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ PAGE ═══════════════════════ */
export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      <Navbar />
      <Hero />
      <FeaturesGrid />
      <HowItWorks />
      <ForWho />
      <TrustSafety />
      <Testimonials />
      <FaqTeaser />
      <CTA />
      <MarketingFooter />
    </div>
  );
}
