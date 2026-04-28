import { MarketingLayout, PageHeader, proseStyle } from '../../components/common/MarketingLayout';

const LAST_UPDATED = '2026-04-01';

export default function TermsPage() {
  return (
    <MarketingLayout>
      <PageHeader kicker="Legal" title="Terms of Service" subtitle={`Last updated: ${LAST_UPDATED}`} />
      <article style={proseStyle}>
        <p>
          These Terms of Service ("Terms") govern your use of the BidWork platform operated by BidWork, Inc. ("BidWork",
          "we", "our"). By creating an account or using the service, you agree to these Terms. If you do not agree, do not
          use BidWork.
        </p>

        <H2>1. The service</H2>
        <p>
          BidWork is a two-sided marketplace for residential home services. We help homeowners scope projects with the
          assistance of AI, publish them to a vetted pool of contractors and skilled workers within a bounded bid range,
          facilitate the offer/acceptance/contracting flow, and document final payment via contractor-issued receipts.
        </p>
        <p>
          BidWork is <strong>not a contractor</strong>, <strong>not an employer</strong>, and <strong>not a payment
          processor for the work itself</strong>. The contractor and homeowner contract directly with each other.
          BidWork's role is to provide tooling, escrow our service fee, and document the engagement.
        </p>

        <H2>2. Eligibility</H2>
        <ul>
          <li>You must be at least 18 years old and legally able to enter into binding contracts.</li>
          <li>Contractors must hold any licenses required by the jurisdiction where they perform the work and keep that information accurate on their profile.</li>
          <li>Skilled workers must accurately represent their qualifications and work eligibility.</li>
        </ul>

        <H2>3. Accounts</H2>
        <p>
          You are responsible for the security of your account and the activity that happens under it. Notify us immediately
          at <a href="mailto:support@bidwork.com" style={{ color: '#2563eb' }}>support@bidwork.com</a> if you suspect unauthorized access.
        </p>

        <H2>4. The bidding flow</H2>
        <ol>
          <li><strong>Project creation.</strong> The homeowner uploads media; BidWork generates an AI-scoped task list with bid range. The homeowner reviews and approves the scope.</li>
          <li><strong>Bidding.</strong> Eligible contractors submit bids that respect the per-task floor.</li>
          <li><strong>Shortlist &amp; Notify.</strong> The homeowner shortlists 1–3 bids and clicks Select &amp; Notify on a chosen bid. The contractor has 72 working hours to accept; otherwise the bid is auto-abandoned and the deposit becomes a credit on that homeowner's project.</li>
          <li><strong>Contract.</strong> Upon acceptance, BidWork generates a work order. Both parties e-sign with typed-name signatures, IP, and timestamp captured.</li>
          <li><strong>Deposit.</strong> Before the contract executes, the homeowner pays a 5% deposit (or the admin-configured percentage) to BidWork via Stripe. This deposit is BidWork's service fee and is non-refundable once the contract is mutually signed.</li>
          <li><strong>Address reveal.</strong> Once both parties sign, full street addresses and contact details are exchanged.</li>
          <li><strong>Work &amp; payment.</strong> The contractor performs the work. The homeowner pays the contractor directly (outside BidWork). The contractor uploads a transaction record to mark the project complete, at which point BidWork generates a final receipt issued by the contractor's company.</li>
        </ol>

        <H2>5. Fees</H2>
        <ul>
          <li>BidWork's only billable transaction is the platform service fee (default 5% of contract value, configurable by BidWork admins). The current rate is shown to the homeowner before the deposit is collected.</li>
          <li>The service fee is collected as a deposit before contract execution and recognized as fee revenue once both parties sign. If the contract is cancelled before mutual signature, the deposit is refunded.</li>
          <li>Additional work orders accepted after contract execution are <strong>not</strong> subject to the service fee. BidWork records them but takes no fee on them.</li>
        </ul>

        <H2>6. Auto-abandonment &amp; deposit credits</H2>
        <p>
          If a contractor fails to accept a homeowner's offer within 72 working hours of the Select &amp; Notify action, the
          system marks the bid <strong>abandoned</strong> and:
        </p>
        <ul>
          <li>The contractor's profile gains an abandonment flag visible to future homeowners.</li>
          <li>Any deposit the homeowner already paid for that bid is converted into a <strong>deposit credit</strong> scoped to that homeowner and project. The credit applies automatically against the next bid the homeowner promotes on the same project. Excess credit remains available for further use on that project.</li>
        </ul>

        <H2>7. Direct payments &amp; receipts</H2>
        <p>
          Payment for the work is made directly between homeowner and contractor outside of BidWork. The contractor must
          maintain a complete billing/tax profile (legal company name, EIN, billing address, signature) before BidWork's
          system will generate their final receipt. BidWork is not a party to that payment, makes no representations about
          its terms, and assumes no liability for it.
        </p>

        <H2>8. Conduct &amp; safety</H2>
        <ul>
          <li>Do not share personal contact information (phone, email, URLs) inside scoped messages or Q&amp;A. Our PII filter strips these automatically and repeated attempts may result in account suspension.</li>
          <li>Do not misrepresent your identity, license, or capability.</li>
          <li>Do not solicit BidWork users to transact off-platform during the bidding/contracting flow.</li>
          <li>Do not upload illegal, defamatory, infringing, or hateful content.</li>
        </ul>

        <H2>9. Intellectual property</H2>
        <p>
          You retain ownership of media and content you upload. You grant BidWork a worldwide, royalty-free license to host,
          process, and display that content as needed to operate the service (including AI scoping inference). BidWork retains
          all rights in the platform itself, including the AI scoping models, contract templates, and UI.
        </p>

        <H2>10. Disclaimers &amp; liability</H2>
        <p>
          BidWork is provided "as is". We do not guarantee the quality, safety, legality, or completion of any work performed
          by a contractor or skilled worker. We are not responsible for disputes between homeowners and contractors over the
          work, payment, or any other off-platform matter. To the fullest extent permitted by law, BidWork's aggregate
          liability for any claim arising from the service is limited to the total service fees we collected from you in the
          six months preceding the claim.
        </p>

        <H2>11. Termination</H2>
        <p>
          You may close your account at any time. BidWork may suspend or terminate accounts that violate these Terms or
          that pose safety risks. Outstanding contracts and receipts remain valid after account closure.
        </p>

        <H2>12. Governing law &amp; disputes</H2>
        <p>
          These Terms are governed by the laws of the State of Delaware, U.S.A. Disputes will be resolved in the state or
          federal courts located in Delaware, except where binding consumer-protection laws of your jurisdiction provide
          otherwise.
        </p>

        <H2>13. Changes</H2>
        <p>We will email registered users at least 14 days before any material change to these Terms takes effect.</p>

        <H2>14. Contact</H2>
        <p>Legal: <a href="mailto:legal@bidwork.com" style={{ color: '#2563eb' }}>legal@bidwork.com</a>. Support: <a href="mailto:support@bidwork.com" style={{ color: '#2563eb' }}>support@bidwork.com</a>.</p>
      </article>
    </MarketingLayout>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 36, marginBottom: 12, letterSpacing: '-0.02em' }}>{children}</h2>;
}
