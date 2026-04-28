import { useState } from 'react';
import { MarketingLayout, PageHeader } from '../../components/common/MarketingLayout';

const SUPPORT_EMAIL = 'support@bidwork.com';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Name, email, and message are required.');
      return;
    }
    // No backend endpoint yet — open a mailto: with the form contents prefilled.
    const subject = encodeURIComponent(`[BidWork ${form.topic}] ${form.name}`);
    const body = encodeURIComponent(`From: ${form.name} <${form.email}>\nTopic: ${form.topic}\n\n${form.message}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <MarketingLayout>
      <PageHeader
        kicker="Get in touch"
        title="We're here to help"
        subtitle="Questions about a project, a bid, billing, or partnerships — pick the right channel below and we'll get back within one business day."
      />

      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 24px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
        <ContactCard icon="📧" title="Email support" lines={[SUPPORT_EMAIL, 'Replies within 1 business day']} />
        <ContactCard icon="🛟" title="Help center" lines={['Visit our FAQ for the most-asked questions', 'about projects, bids, and payouts.']} ctaTo="/faq" ctaLabel="Open FAQ →" />
        <ContactCard icon="🤝" title="Partnerships" lines={['partners@bidwork.com', 'Contractor associations · suppliers · referrals']} />
      </section>

      <section style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 80px' }}>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 8, letterSpacing: '-0.02em' }}>Send us a message</h2>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
            We don't run a ticketing system inside the app yet, so this form opens your default mail client with the message
            pre-filled to {SUPPORT_EMAIL}. Adjust before sending if you need to.
          </p>
          {sent && <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 14 }}>Your email client should be open. If not, send to <strong>{SUPPORT_EMAIL}</strong> directly.</div>}
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 14 }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Your name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
            <Field label="Your email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} />
            <div>
              <label style={labelStyle}>Topic</label>
              <select value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="general">General question</option>
                <option value="homeowner-support">Homeowner support</option>
                <option value="contractor-support">Contractor support</option>
                <option value="billing">Billing or service fee</option>
                <option value="dispute">Dispute about a bid or contract</option>
                <option value="press">Press / partnerships</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Message</label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <button type="submit" style={{ alignSelf: 'flex-start', padding: '12px 28px', fontSize: 15, fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', border: 'none', borderRadius: 10, cursor: 'pointer' }}>
              Open in mail app
            </button>
          </form>
        </div>
      </section>
    </MarketingLayout>
  );
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', fontSize: 15, border: '1px solid #d1d5db', borderRadius: 10, boxSizing: 'border-box', color: '#0f172a', background: 'white' };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 };

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function ContactCard({ icon, title, lines, ctaTo, ctaLabel }: { icon: string; title: string; lines: string[]; ctaTo?: string; ctaLabel?: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
      <div style={{ width: 44, height: 44, borderRadius: 11, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 14 }}>{icon}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>{title}</h3>
      {lines.map((l, i) => (
        <p key={i} style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{l}</p>
      ))}
      {ctaTo && (
        <a href={ctaTo} style={{ display: 'inline-block', marginTop: 10, fontSize: 13, fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}>{ctaLabel}</a>
      )}
    </div>
  );
}
