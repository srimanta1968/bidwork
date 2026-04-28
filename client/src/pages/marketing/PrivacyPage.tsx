import { MarketingLayout, PageHeader, proseStyle } from '../../components/common/MarketingLayout';

const LAST_UPDATED = '2026-04-01';

export default function PrivacyPage() {
  return (
    <MarketingLayout>
      <PageHeader kicker="Privacy" title="Privacy Policy" subtitle={`Last updated: ${LAST_UPDATED}`} />
      <article style={proseStyle}>
        <p>
          BidWork, Inc. ("BidWork", "we", "our") provides a marketplace that connects homeowners with vetted contractors and
          skilled workers. This Privacy Policy explains what information we collect, how we use it, and the controls you have
          over your data. It is written for clarity, not lawyer-readability — but it is the operative policy. If anything is
          unclear, write to <a href="mailto:privacy@bidwork.com" style={{ color: '#2563eb' }}>privacy@bidwork.com</a>.
        </p>

        <H2>1. Information we collect</H2>
        <H3>Account &amp; profile</H3>
        <ul>
          <li>Email address, name, phone number, and role (Homeowner / Contractor / Skilled Worker).</li>
          <li>For contractors and skilled workers: business name, license number, category, service area, and (when generating receipts) legal company name, EIN/Tax ID, billing address, and signature image.</li>
          <li>For homeowners: project property address (used to compute the public city/zip and revealed in full only after a contract is mutually signed).</li>
        </ul>

        <H3>Project &amp; bid content</H3>
        <ul>
          <li>Photos and videos you upload for AI scoping. Stored on Amazon S3 with private ACLs and time-limited access URLs.</li>
          <li>Bid amounts, task breakdowns, materials lists, attached documents, and additional work orders.</li>
          <li>Messages exchanged inside private 1-on-1 bid threads. We strip phone numbers, emails, URLs, and social handles from the visible message via an automated moderation step.</li>
        </ul>

        <H3>Transactional</H3>
        <ul>
          <li>The 5% deposit you pay to BidWork. Card data is processed and stored by Stripe; we receive only a tokenized intent identifier and the success/failure state.</li>
          <li>Contractor-uploaded transaction records (bank confirmations, check copies, processor screenshots) used to mark a project complete. The actual homeowner→contractor payment never flows through BidWork.</li>
        </ul>

        <H3>Technical</H3>
        <ul>
          <li>Standard request logs (IP address, user agent, timestamps) for fraud detection and reliability.</li>
          <li>Cookies and local storage for sign-in tokens and preference persistence.</li>
        </ul>

        <H2>2. How we use it</H2>
        <ul>
          <li>To match homeowners with contractors and serve the marketplace experience (sign-up, bidding, messaging, contracting, completion).</li>
          <li>To compute AI-generated scopes from your uploaded media. Media is sent to our LLM partner under a confidentiality and no-training-on-customer-data agreement.</li>
          <li>To send transactional emails — verification codes, offer notifications, reminders, abandonment alerts, and receipts — via SendGrid.</li>
          <li>To enforce platform safety: PII redaction across role boundaries, abandonment flags on contractors who fail to respond, and audit trails on every workflow state change.</li>
        </ul>

        <H2>3. Who can see what</H2>
        <p>BidWork enforces strict role-based privacy:</p>
        <ul>
          <li><strong>Contractors</strong> never see homeowner email, phone, or full street address before their bid is accepted. Only the city and zip code are public.</li>
          <li><strong>Homeowners</strong> never see contractor email, phone, or business street address before they accept a bid. Display name, business name, license number, city, state, and rating are public.</li>
          <li><strong>Bid amounts and attachments</strong> are visible only to the bid's contractor and the project's homeowner. Other contractors bidding on the same project never see their competitors' bids.</li>
          <li><strong>Full address pairs</strong> are released only after the contract is mutually signed.</li>
          <li><strong>Private bid messages</strong> are visible only to the homeowner and that bid's contractor.</li>
        </ul>

        <H2>4. Sharing &amp; processors</H2>
        <p>We share data with the following sub-processors only to deliver the service:</p>
        <ul>
          <li><strong>Amazon Web Services</strong> — application hosting, database, S3 file storage.</li>
          <li><strong>Stripe</strong> — deposit payment processing.</li>
          <li><strong>SendGrid</strong> — transactional email.</li>
          <li><strong>Together AI / OpenAI-compatible LLM</strong> — scoping inference. Your media is sent for inference only and not used to train the model.</li>
        </ul>
        <p>We do not sell your personal information. We do not run third-party advertising trackers in the app.</p>

        <H2>5. Retention</H2>
        <ul>
          <li>Account data is kept for as long as your account is active, plus 12 months after closure for compliance.</li>
          <li>Project media is retained until you delete the project or close your account.</li>
          <li>Receipts, contracts, and audit logs are retained for 7 years to satisfy tax and legal recordkeeping.</li>
        </ul>

        <H2>6. Your controls</H2>
        <ul>
          <li><strong>Access &amp; export.</strong> Email <a href="mailto:privacy@bidwork.com" style={{ color: '#2563eb' }}>privacy@bidwork.com</a> and we will provide a machine-readable copy of your data within 30 days.</li>
          <li><strong>Correction.</strong> Edit profile fields directly in the app. Other corrections can be requested via support.</li>
          <li><strong>Deletion.</strong> You can close your account from your profile or by emailing support. Records related to executed contracts and tax-relevant receipts are retained per Section 5.</li>
          <li><strong>Email preferences.</strong> Transactional emails (offer notifications, reminders, receipts) cannot be disabled while your account is active because they are part of the service. We do not send marketing emails by default.</li>
        </ul>

        <H2>7. Security</H2>
        <p>
          We use TLS in transit, encrypted-at-rest storage on AWS, bcrypt password hashing, and JWT-based session tokens.
          BidWork employees access production data only when investigating a specific support request, and that access is
          logged. We run periodic vulnerability scans and respond to disclosed issues at <a href="mailto:security@bidwork.com" style={{ color: '#2563eb' }}>security@bidwork.com</a>.
        </p>

        <H2>8. Children</H2>
        <p>BidWork is for adults. We do not knowingly collect data from anyone under 16.</p>

        <H2>9. International users</H2>
        <p>
          BidWork is operated from the United States. By using the service from outside the U.S., you consent to your data
          being processed in the U.S. We will honor data-subject rights under GDPR/CCPA where they apply — contact us to
          exercise them.
        </p>

        <H2>10. Changes</H2>
        <p>
          When we change this policy materially, we will email registered users at least 14 days before the change takes
          effect. The Last updated date at the top of this page reflects the most recent revision.
        </p>

        <H2>11. Contact</H2>
        <p>Privacy questions: <a href="mailto:privacy@bidwork.com" style={{ color: '#2563eb' }}>privacy@bidwork.com</a>. General support: <a href="mailto:support@bidwork.com" style={{ color: '#2563eb' }}>support@bidwork.com</a>.</p>
      </article>
    </MarketingLayout>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 36, marginBottom: 12, letterSpacing: '-0.02em' }}>{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', marginTop: 18, marginBottom: 6 }}>{children}</h3>;
}
