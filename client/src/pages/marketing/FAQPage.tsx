import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MarketingLayout, PageHeader } from '../../components/common/MarketingLayout';

interface FaqItem { q: string; a: React.ReactNode }
interface Section { id: string; label: string; intro: string; items: FaqItem[] }

const SECTIONS: Section[] = [
  {
    id: 'general',
    label: 'General',
    intro: 'High-level questions about BidWork, our pricing, and how we differ from a lead marketplace.',
    items: [
      { q: 'What is BidWork?', a: <>BidWork is a marketplace that scopes home projects with AI <em>before</em> any contractor is involved, then lets vetted contractors and skilled workers bid on a clear, photo-documented job. Unlike lead marketplaces, we do not sell your contact info — pricing is bounded, scopes are pre-approved, and contracts are mutually e-signed.</> },
      { q: 'Is it free to sign up?', a: <>Yes. Creating an account, uploading photos, and receiving an AI scope are free. Our only fee is the platform service fee (5% by default, configurable by admins) charged to the homeowner as a deposit when a contractor accepts an offer.</> },
      { q: 'Does BidWork take a cut of my payment to the contractor?', a: <>No. The 5% deposit you pay to BidWork is our entire service fee. Payment for the work itself goes directly from the homeowner to the contractor outside of BidWork. We document it via the contractor-issued final receipt, but we are not a party to that transaction.</> },
      { q: 'How do you handle privacy?', a: <>Strict role-based privacy. Contractors never see homeowner email/phone/street address before a bid is accepted. Homeowners never see contractor contact details before they accept a bid. Other contractors bidding on the same project never see their competitors' bids. See our <Link to="/privacy" style={{ color: '#2563eb' }}>Privacy Policy</Link> for the full breakdown.</> },
      { q: 'What if my project is delayed or my contractor stops responding?', a: <>Built into the workflow: if a notified contractor doesn't accept within 72 working hours, the system auto-abandons their bid, flags their profile publicly, converts your deposit into a credit on your project, and prompts you to promote the next-ranked shortlisted bidder — all automatically.</> },
    ],
  },
  {
    id: 'homeowner',
    label: 'Homeowner process',
    intro: 'Step-by-step for homeowners — from photos to executed contract to a final receipt.',
    items: [
      { q: '1. How do I start a project?', a: <>Sign up as a Homeowner, click <strong>+ New Project</strong>, and upload photos and short videos of the work area. The clearer your media, the more accurate the AI scope.</> },
      { q: '2. What does the AI scope contain?', a: <>A line-by-line task list with a description, photo evidence, estimated labor hours, materials, and a low/high cost band per task. The sum across tasks gives a starting bid total. You can edit any task, hide tasks you don\'t want, or override the AI price before publishing.</> },
      { q: '3. Can I change the AI-suggested price?', a: <>Yes. On the Scope Review page, every task has an editable Start Bid Price field. Set your own number or click "Reset to AI" to revert. The Calculated Starting Bid banner at the top of the page updates live.</> },
      { q: '4. Who sees my project?', a: <>Once approved, the project is published to vetted contractors and skilled workers whose service area covers your city or zip. Only your city + zip are public — your full address is hidden until a bid is accepted and the contract is mutually signed.</> },
      { q: '5. How do I pick a contractor?', a: <>Open the <strong>Bids</strong> tab on your project. Each card shows the contractor's bid amount, timeline, license, and any abandonment flags. Rank your top 1–3 bids and click <strong>Select &amp; Notify</strong> on your top pick. The contractor is emailed and has 72 working hours to accept.</> },
      { q: '6. What is the deposit?', a: <>5% of the contract value (or whatever rate our admins have configured). It is BidWork\'s service fee and is collected before the contract executes. Once both parties sign, it is recognized as our fee and we issue you a receipt.</> },
      { q: '7. What if the contractor doesn\'t accept?', a: <>The system auto-abandons their offer at the 72-working-hour mark. We notify you with a one-click action to promote your next-ranked bid. Any deposit you already paid becomes a credit on your project and applies automatically to the next bid — you only pay the difference, if any.</> },
      { q: '8. How is the contract signed?', a: <>BidWork generates a work order with the parties, scope, pricing, and BidWork terms. Both you and the contractor type your name as signature; we record the IP and timestamp. Once both sides sign, full street addresses and contact details are exchanged so work can begin.</> },
      { q: '9. What about extra work outside the original scope?', a: <>The contractor can add an Additional Work Order with title, amount, and (optionally) photos. You see it as Pending Approval and can Accept (with a typed-name signature) or Reject (with notes). Recording-only — BidWork takes no fee on additional work.</> },
      { q: '10. How do I close the project?', a: <>Pay the contractor directly using whatever method you both agreed on. The contractor uploads a transaction proof (bank confirmation, check copy, processor screenshot) plus the payment method and reference. The system generates the final receipt — issued by the contractor\'s company — and emails it to you.</> },
    ],
  },
  {
    id: 'contractor',
    label: 'Contractor process',
    intro: 'Step-by-step for general contractors — from finding jobs to issuing the final receipt.',
    items: [
      { q: '1. How do I qualify to bid?', a: <>Sign up as a Contractor, complete onboarding (business name, license, category, service area), and verify your email. Once your service area covers a homeowner\'s city or zip, matching projects appear in <strong>Available Jobs</strong>.</> },
      { q: '2. How do I bid on a project?', a: <>Open a job from <strong>Available Jobs</strong>. The expanded form shows each task with its start-price floor. Enter your labor cost per task and add any optional notes; the system rolls up your total bid amount automatically. Each task labor must meet or exceed that task\'s floor.</> },
      { q: '3. Can I attach materials?', a: <>Yes. From your <strong>My Catalogs</strong> page, build product catalogs with photos, brands, model numbers, and unit prices. When bidding, attach selected items per task; the materials subtotal is added to your line total automatically.</> },
      { q: '4. Can I attach proposal documents?', a: <>Yes. After submitting a bid, the bid card on your dashboard has an Attachments panel where you can upload PDFs, DOC/DOCX, or images (max 10 files, 25 MB each). Only the homeowner of the project can see them.</> },
      { q: '5. What does Select & Notify mean?', a: <>The homeowner has chosen your bid. You\'ll receive a BidWork-branded email and an in-app alert. You have 72 working hours to click <strong>Accept Offer</strong>. If you miss the window, the bid auto-abandons, your profile gains a public abandonment flag, and the homeowner is prompted to promote the next-ranked bidder.</> },
      { q: '6. What happens after I accept?', a: <>The system generates a legal work order from the project scope, the line items, and the BidWork terms. The homeowner pays the deposit; both parties e-sign. Once both signatures land, full addresses are exchanged.</> },
      { q: '7. Can I add work outside the original scope?', a: <>Yes — open the bid card and click <strong>Add Extra Work</strong>. Submit a title, description, amount, and optional photos. The homeowner gets a Pending Approval action; nothing counts toward the engagement until they Accept.</> },
      { q: '8. How does payment work?', a: <>You and the homeowner settle payment outside BidWork — bank transfer, check, ACH, processor of your choice. There is no BidWork-imposed payment method. You retain the funds; we never touch them.</> },
      { q: '9. How do I issue a receipt?', a: <>Two prerequisites: (a) your billing &amp; tax profile must be complete on the Profile page (legal company name, EIN, billing address, billing phone, signature image); (b) you must record the transaction inside BidWork. Click <strong>Mark Payment Received</strong> on the bid, pick the payment method, paste the reference (Stripe pi_xxx, check #, wire confirmation, etc.), upload the transaction proof, and submit. We generate the receipt with your company as the legal issuer and email it to the homeowner.</> },
      { q: '10. What does an abandonment flag look like to other homeowners?', a: <>A small amber chip next to your name reading "⚠ Abandoned X prior offer(s)" on every bid card you submit going forward, with a tooltip explaining you missed a 72-working-hour acceptance window. Repeat abandonments make it harder to win selection.</> },
    ],
  },
  {
    id: 'skilled',
    label: 'Skilled worker process',
    intro: 'Step-by-step for individual skilled workers (electricians, plumbers, painters, handymen).',
    items: [
      { q: '1. Skilled worker vs. contractor — what\'s the difference?', a: <>Contractors are licensed businesses that take whole jobs end-to-end. Skilled workers are individuals offering specific trades (e.g. licensed electrician, master plumber, painter) on a per-task basis. Homeowners can choose to make a project visible to <em>contractors</em>, <em>skilled workers</em>, or <em>both</em> — set during project creation and shown to you when browsing jobs.</> },
      { q: '2. How do I sign up?', a: <>Create an account as a Skilled Worker, complete onboarding (phone, skills, category, service area). License number is optional but strongly recommended for licensed trades.</> },
      { q: '3. How does bidding work?', a: <>Same as contractors: you see the AI-scoped task list, enter labor per task, optionally attach materials from your catalog, and submit. Materials are not required — many skilled workers bid labor-only and leave materials to the homeowner or contractor.</> },
      { q: '4. Can I bid on parts of a job?', a: <>Yes. You can leave the labor field empty for tasks outside your scope. The bid total reflects only the tasks you actually labor for.</> },
      { q: '5. Are deposits required when I\'m the selected worker?', a: <>Yes — the homeowner pays the same 5% platform service fee deposit before the contract executes, regardless of whether the work is done by a contractor or a skilled worker.</> },
      { q: '6. Do I need a billing/tax profile to issue receipts?', a: <>Yes. Same flow as contractors: complete the Billing &amp; Tax Information section on your Profile page (legal name, EIN if you have one, billing address, billing phone, signature image). Without a complete profile, the system cannot issue your final receipt and the project cannot close.</> },
      { q: '7. What if I\'m self-employed without an EIN?', a: <>You can use your SSN in the EIN field if you operate as a sole proprietor without a separate tax ID. Speak with a tax professional if you\'re unsure — BidWork doesn\'t provide tax advice. The receipt format treats the field as a generic Tax ID.</> },
      { q: '8. How do I record payment received?', a: <>Same as contractors. Open the accepted bid, click <strong>Mark Payment Received</strong>, choose method (bank transfer, check, cash, Zelle, Venmo, etc.), paste a reference, upload a proof document, and submit. The receipt is generated with your name/company as issuer and emailed to the homeowner.</> },
      { q: '9. What about abandonment flags?', a: <>The same 72-working-hour acceptance SLA applies. If you don\'t accept a homeowner\'s offer in time, the system auto-abandons it and surfaces an abandonment flag on your profile. Take care to accept or decline promptly.</> },
    ],
  },
  {
    id: 'billing',
    label: 'Billing & refunds',
    intro: 'Money questions — deposits, credits, refunds, and the service fee.',
    items: [
      { q: 'When is the deposit refundable?', a: <>The deposit is refundable in full if the contract is cancelled <strong>before</strong> both parties sign. After mutual signature, the deposit is recognized as BidWork\'s non-refundable service fee.</> },
      { q: 'What happens to my deposit if the contractor abandons?', a: <>It does not refund — but it doesn\'t disappear either. It converts into a <strong>deposit credit</strong> scoped to your project. When you promote the next-ranked bidder, the credit applies automatically. Excess credit (if the new bid is smaller) carries forward on the same project.</> },
      { q: 'What if I want to change the platform fee percentage?', a: <>That setting is admin-controlled. Our admins can raise or lower the rate at any time, but historical deposits are immutable — they keep the percentage that was in effect when collected.</> },
      { q: 'Where do I see receipts?', a: <>On your project detail page (Receipts tab) and emailed to you. There are two: the BidWork service-fee receipt (issued at contract execution) and the contractor\'s final payment receipt (issued when the contractor records payment received).</> },
    ],
  },
];

export default function FAQPage() {
  const [active, setActive] = useState(SECTIONS[0].id);
  const section = SECTIONS.find(s => s.id === active)!;

  return (
    <MarketingLayout>
      <PageHeader
        kicker="FAQ"
        title="Everything you need to know"
        subtitle="Pick a section below — we walk through the BidWork process step-by-step from each role's perspective, and answer the billing questions that come up most."
      />

      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, justifyContent: 'center' }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              style={{ padding: '10px 18px', fontSize: 14, fontWeight: 600, borderRadius: 999, cursor: 'pointer',
                border: active === s.id ? '1px solid #2563eb' : '1px solid #e2e8f0',
                background: active === s.id ? '#2563eb' : 'white',
                color: active === s.id ? 'white' : '#475569' }}>
              {s.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 32, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>{section.intro}</p>

        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {section.items.map((item, i) => (
            <FaqRow key={`${section.id}-${i}`} item={item} />
          ))}
        </div>
      </section>

      <section style={{ padding: '24px 24px 80px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: 28, background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Still have a question?</p>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Email <a href="mailto:support@bidwork.com" style={{ color: '#2563eb' }}>support@bidwork.com</a> or open a ticket from the Contact page. We respond within one business day.</p>
          <Link to="/contact" style={{ display: 'inline-block', padding: '10px 22px', fontSize: 14, fontWeight: 600, color: 'white', background: '#2563eb', borderRadius: 10, textDecoration: 'none' }}>
            Contact support
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}

function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', textAlign: 'left', padding: '16px 20px', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{item.q}</span>
        <span style={{ fontSize: 18, color: '#94a3b8', transform: open ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px', fontSize: 15, lineHeight: 1.7, color: '#475569' }}>
          {item.a}
        </div>
      )}
    </div>
  );
}
