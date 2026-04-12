import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import LanguageSwitcher from '../components/common/LanguageSwitcher';

/* ═══════════════════════ NAVBAR ═══════════════════════ */
function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 15 }}>B</div>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>BidWork</span>
        </Link>

        <div style={{ display: 'none', gap: 32, alignItems: 'center' }} className="md:!flex">
          {['Features', 'How It Works', 'Pricing'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}>
              {item}
            </a>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <LanguageSwitcher />
          {isAuthenticated ? (
            <>
              <span style={{ fontSize: 14, color: '#64748b', marginRight: 8 }}>Hi, {user?.email?.split('@')[0]}</span>
              <button onClick={logout} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px' }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: '#475569', padding: '9px 20px', textDecoration: 'none', borderRadius: 8 }}>Sign In</Link>
              <Link to="/register" style={{ fontSize: 14, fontWeight: 600, color: 'white', padding: '9px 22px', textDecoration: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 1px 3px rgba(37,99,235,0.3)' }}>Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════ HERO ═══════════════════════ */
function Hero() {
  return (
    <section style={{ paddingTop: 140, paddingBottom: 80, background: '#ffffff', position: 'relative', overflow: 'hidden' }}>
      {/* Subtle background gradient */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'radial-gradient(ellipse at 50% 0%, rgba(37,99,235,0.04) 0%, transparent 60%)' }} />

      <div style={{ position: 'relative', maxWidth: 880, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <h1 className="animate-fade-up" style={{ fontSize: 'clamp(36px, 5.5vw, 62px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#0f172a', marginBottom: 24 }}>
          Turn Home Project Photos into{' '}
          <span className="gradient-text">Qualified Bids</span>
        </h1>

        <p className="animate-fade-up-delay" style={{ fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.7, color: '#64748b', maxWidth: 640, margin: '0 auto 40px', fontWeight: 400 }}>
          AI scopes your project, documents every task with photo evidence, and sets a fair bid range — so you can focus on choosing the right contractor instead of explaining the job.
        </p>

        <div className="animate-fade-up-delay2" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 64 }}>
          <Link to="/register" style={{ fontSize: 16, fontWeight: 600, color: 'white', padding: '14px 32px', textDecoration: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,99,235,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37,99,235,0.3)'; }}>
            Start Free Today
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
          <Link to="#how-it-works" style={{ fontSize: 16, fontWeight: 600, color: '#475569', padding: '14px 32px', textDecoration: 'none', borderRadius: 10, border: '1px solid #e2e8f0', background: 'white', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}>
            See How It Works
          </Link>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
          {[
            { value: '3x', label: 'Faster Kickoff' },
            { value: '40%', label: 'Less Rework' },
            { value: '$0', label: 'To Get Started' },
            { value: '100%', label: 'Scope Clarity' },
          ].map((stat, i) => (
            <div key={stat.label} style={{ padding: '16px 40px', textAlign: 'center', borderLeft: i > 0 ? '1px solid #e2e8f0' : 'none' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>{stat.value}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8', marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ FEATURES GRID ═══════════════════════ */
function FeaturesGrid() {
  const features = [
    { icon: '📸', title: 'Photo & Video Upload', desc: 'Upload project media from your phone. Our AI processes every angle to understand the full scope.' },
    { icon: '🤖', title: 'AI Scope Generation', desc: 'Get a detailed task list with materials, labor estimates, and photo evidence per task — automatically.' },
    { icon: '✏️', title: 'Editable Task List', desc: 'Review, edit, add, or remove tasks. You approve the final scope before any contractor sees it.' },
    { icon: '💰', title: 'Fair Bid Range', desc: 'Every project gets a floor-to-ceiling price range based on market data. No surprises.' },
    { icon: '👷', title: 'Vetted Contractors', desc: 'Only qualified contractors bid on your project. They compete on quality and speed, not just price.' },
    { icon: '📋', title: 'Photo Documentation', desc: 'Every task includes photo evidence from your upload. Contractors see exactly what needs to be done.' },
  ];

  return (
    <section id="features" style={{ padding: '96px 0', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Features</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 16 }}>Everything You Need to Scope & Bid</h2>
          <p style={{ fontSize: 17, color: '#64748b', maxWidth: 560, margin: '0 auto' }}>From photo upload to accepted bid, BidWork gives you a complete toolkit for home project execution.</p>
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
  const steps = [
    { num: '1', title: 'Upload Your Project', desc: 'Snap photos or record a walkthrough video of your home project. Any project — kitchens, bathrooms, decks, roofing.', color: '#2563eb' },
    { num: '2', title: 'AI Scopes the Work', desc: 'Our AI analyzes every detail — identifying tasks, materials, and labor. You get a full scope with a bid range.', color: '#7c3aed' },
    { num: '3', title: 'Review & Approve', desc: 'Edit the task list, adjust priorities, approve the scope. Nothing goes to contractors without your sign-off.', color: '#0891b2' },
    { num: '4', title: 'Receive Fair Bids', desc: 'Vetted contractors see your pre-scoped job and bid within range. Choose based on quality, reviews, and timeline.', color: '#059669' },
  ];

  return (
    <section id="how-it-works" style={{ padding: '96px 0', background: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>How It Works</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 16 }}>Four Steps to Your Perfect Project</h2>
          <p style={{ fontSize: 17, color: '#64748b', maxWidth: 560, margin: '0 auto' }}>No more guesswork. No more surprise invoices. Total control from day one.</p>
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

/* ═══════════════════════ SPLIT SECTIONS ═══════════════════════ */
function ForWho() {
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
          <p style={{ fontSize: 13, fontWeight: 700, color: '#059669', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Built for Both Sides</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Whether You Own It or Build It</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 28 }}>
          {/* Homeowners */}
          <div style={{ background: 'white', borderRadius: 16, padding: 40, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24 }}>🏠</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>For Homeowners</h3>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>Know exactly what your project involves and what it should cost — before talking to anyone.</p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <CheckItem text="AI-generated scope from your photos" color="#2563eb" />
              <CheckItem text="Editable task list you fully control" color="#2563eb" />
              <CheckItem text="Fair bid range — floor to ceiling" color="#2563eb" />
              <CheckItem text="Photo evidence attached to each task" color="#2563eb" />
            </ul>
          </div>

          {/* Contractors */}
          <div style={{ background: 'white', borderRadius: 16, padding: 40, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24 }}>🔨</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>For Contractors</h3>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>Stop wasting time on vague leads. Every job comes pre-scoped with clear expectations.</p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <CheckItem text="Pre-scoped, photo-documented jobs" color="#059669" />
              <CheckItem text="Defined bid range — no race to bottom" color="#059669" />
              <CheckItem text="Compete on quality and speed" color="#059669" />
              <CheckItem text="Less rework, faster project close" color="#059669" />
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ TESTIMONIALS ═══════════════════════ */
function Testimonials() {
  const reviews = [
    { text: "BidWork completely changed how I approach home projects. I knew exactly what I was paying for before the first contractor showed up.", name: 'Sarah M.', role: 'Homeowner, Austin TX', color: '#2563eb' },
    { text: "As a contractor, I love that jobs come pre-scoped. I see the photos, the task list, and the budget — and I bid with confidence.", name: 'Marcus J.', role: 'General Contractor', color: '#059669' },
    { text: "The bid range feature is brilliant. I got three bids, all within range, and chose based on reviews and timeline instead of just price.", name: 'Rachel K.', role: 'Homeowner, Portland OR', color: '#7c3aed' },
  ];

  return (
    <section style={{ padding: '96px 0', background: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Testimonials</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Loved by Homeowners & Contractors</h2>
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
  return (
    <section style={{ padding: '96px 0', background: '#f8fafc' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ borderRadius: 24, padding: '72px 40px', textAlign: 'center', background: 'linear-gradient(135deg, #1e3a8a, #4f46e5, #0e7490)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'radial-gradient(ellipse at top right, white, transparent 60%)' }} />
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, color: 'white', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 16 }}>
              Ready to scope your next project?
            </h2>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.75)', maxWidth: 500, margin: '0 auto 36px', lineHeight: 1.6 }}>
              Create a free account and let AI define your project in minutes.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
              <Link to="/register" style={{ fontSize: 16, fontWeight: 700, padding: '14px 36px', background: 'white', color: '#1e3a8a', borderRadius: 10, textDecoration: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.15)', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
                Get Started Free
              </Link>
              <Link to="/register" style={{ fontSize: 16, fontWeight: 600, padding: '14px 36px', background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, textDecoration: 'none' }}>
                I'm a Contractor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ FOOTER ═══════════════════════ */
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #f1f5f9', padding: '32px 0', background: 'white' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 11 }}>B</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>BidWork</span>
        </div>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>The operating system for home services execution.</p>
        <p style={{ fontSize: 13, color: '#cbd5e1' }}>&copy; {new Date().getFullYear()} BidWork. All rights reserved.</p>
      </div>
    </footer>
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
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}
