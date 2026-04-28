import { Link } from 'react-router-dom';
import { MarketingLayout, PageHeader } from '../../components/common/MarketingLayout';

export default function AboutPage() {
  return (
    <MarketingLayout>
      <PageHeader
        kicker="About BidWork"
        title="The operating system for home services execution"
        subtitle="We rebuilt the homeowner ↔ contractor experience around three ideas: AI understands the job first. Humans refine. Pricing is bounded."
      />

      <section style={{ maxWidth: 880, margin: '0 auto', padding: '56px 24px 24px', color: '#334155', fontSize: 16, lineHeight: 1.75 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 12, letterSpacing: '-0.02em' }}>What we do</h2>
        <p>
          BidWork is a two-sided marketplace where homeowners upload videos and photos of a project and receive an AI-generated
          scope of work — task by task, with photo evidence, labor and materials estimates, and a calculated bid range — all
          before any contractor is involved. Vetted contractors then review the pre-scoped, photo-documented job and submit
          informed bids inside the bounded range.
        </p>
        <p>
          We are not a lead marketplace. We are a job-definition engine plus a controlled bidding marketplace, with
          legally-documented contracts, escrowed platform fees, and contractor-issued receipts that close the loop on every
          engagement.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 40, marginBottom: 12, letterSpacing: '-0.02em' }}>Why we exist</h2>
        <p>
          Home improvement is one of the largest and least transparent markets in the U.S. — over $400 billion a year in
          spend, but riddled with mismatched expectations, surprise change orders, and disputes that stem from one root
          cause: nobody agrees what the job is before the work begins. We close that gap by scoping the job first, with AI
          and photos, so contractors and homeowners start from the same picture.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 40, marginBottom: 12, letterSpacing: '-0.02em' }}>How we make money</h2>
        <p>
          BidWork charges a single platform service fee — 5% by default of the contract value, configurable by our admins —
          collected as a deposit from the homeowner once a contractor accepts an offer. When both parties sign the work order,
          the deposit is recognized as our service fee and we issue a receipt to the homeowner. We are not a party to the
          payment for the work itself; that flows directly between homeowner and contractor and is documented in a separate
          receipt issued by the contractor's company.
        </p>

        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginTop: 40, marginBottom: 12, letterSpacing: '-0.02em' }}>What we believe</h2>
        <ul style={{ paddingLeft: 24 }}>
          <li><strong>Transparency over leverage.</strong> Both parties see the same scope, the same bid range, and the same contract.</li>
          <li><strong>Privacy by default.</strong> Contact details are revealed only after a contract is mutually signed.</li>
          <li><strong>Bounded pricing.</strong> Bids must respect the per-task floor; no race-to-the-bottom and no surprise inflation.</li>
          <li><strong>Accountability.</strong> Contractors who don't honor accepted offers are flagged publicly and the homeowner's deposit becomes a credit, not a loss.</li>
        </ul>

        <div style={{ marginTop: 48, padding: 28, background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Ready to start?</p>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Create your first project for free, or sign up as a contractor to start bidding on AI-scoped jobs.</p>
          <Link to="/register" style={{ display: 'inline-block', padding: '12px 28px', fontSize: 15, fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #2563eb, #4f46e5)', borderRadius: 10, textDecoration: 'none' }}>
            Get started — it's free
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}
