import { useState, useEffect } from 'react';
import { createDepositIntent, listBidReceipts } from '../../services/projectApi';

interface Props {
  bidId: string;
  bidWorkflowState?: string;
  viewerRole: 'homeowner' | 'contractor';
}

export default function DepositReceiptsPanel({ bidId, bidWorkflowState, viewerRole }: Props) {
  const [intent, setIntent] = useState<any>(null);
  const [receipts, setReceipts] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadReceipts(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [bidId, bidWorkflowState]);

  const loadReceipts = async () => {
    try {
      const r = await listBidReceipts(bidId);
      if (r.success) setReceipts(r.data);
    } catch { /* silent */ }
  };

  const handleCreateIntent = async () => {
    setError(''); setLoading(true);
    try {
      const r = await createDepositIntent(bidId);
      if (r.success) setIntent(r.data);
      else setError(r.error || 'Failed to create deposit intent');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  // Pre-deposit informational states (homeowner only): both signed but the
  // schedule is still being agreed. We show a stage-aware message instead of
  // the Pay Deposit button so the owner does not pay before the schedule is
  // approved by both parties.
  const preDepositState = viewerRole === 'homeowner' &&
    bidWorkflowState && ['contract_owner_signed','contract_contractor_signed','contract_drafted','schedule_proposed'].includes(bidWorkflowState);

  // Pay Deposit becomes available only after the schedule is approved, and
  // disappears once the bid advances to 'scheduled' (deposit collected).
  const showDepositCta = viewerRole === 'homeowner' && bidWorkflowState === 'schedule_approved';

  return (
    <div style={{ marginTop: 10 }}>
      {preDepositState && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Deposit not due yet</h4>
          <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
            The 5% BidWork deposit becomes due <strong>after</strong> the contractor proposes a schedule and you approve it.
            {bidWorkflowState === 'schedule_proposed'
              ? ' The contractor has sent a schedule for your review — please approve it (or request changes) in the Work Order panel above. The Pay Deposit button will appear once the schedule is approved.'
              : ' Waiting for the contractor to propose a schedule. Once submitted, you can approve it (or request changes) in the Work Order panel above, and then pay the deposit.'}
          </p>
        </div>
      )}
      {showDepositCta && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 6 }}>BidWork Service Fee Deposit</h4>
          <p style={{ fontSize: 12, color: '#1e3a8a', marginBottom: 10 }}>
            Schedule approved — the 5% platform deposit is now due. Once paid, BidWork reveals contact details and the contractor can begin work on the agreed start date.
          </p>
          {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{error}</p>}
          {!intent ? (
            <button onClick={handleCreateIntent} disabled={loading}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: loading ? '#93c5fd' : '#2563eb', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating intent...' : 'Pay Deposit'}
            </button>
          ) : intent.residual_due_cents === 0 ? (
            <div style={{ padding: '10px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8 }}>
              <p style={{ fontSize: 13, color: '#059669', fontWeight: 600 }}>Fully covered by credit</p>
              <p style={{ fontSize: 12, color: '#065f46' }}>
                Available credit: ${(intent.available_credit_cents / 100).toFixed(2)}. No additional payment due.
              </p>
            </div>
          ) : (
            <div style={{ padding: '10px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <p style={{ fontSize: 13, color: '#475569' }}>
                Full deposit: ${(intent.amount_cents / 100).toFixed(2)} ·{' '}
                {intent.available_credit_cents > 0 && <>credit applied: ${(intent.available_credit_cents / 100).toFixed(2)} ·{' '}</>}
                <strong>residual due ${(intent.residual_due_cents / 100).toFixed(2)}</strong>
              </p>
              {intent.client_secret && (
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  Client secret: <code style={{ fontSize: 11 }}>{String(intent.client_secret).slice(0, 32)}…</code>
                  {intent.mock && <span style={{ marginLeft: 8, color: '#dc2626' }}>(mock — Stripe key not configured)</span>}
                </p>
              )}
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                Wire Stripe Elements here in production to confirm the PaymentIntent. The webhook will mark the deposit collected on success.
              </p>
            </div>
          )}
        </div>
      )}

      {receipts && (receipts.service_fee || receipts.contractor_payment) && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginTop: 10 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Receipts</h4>
          {receipts.service_fee && (
            <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1e3a8a' }}>BidWork Service Fee</p>
              <p style={{ fontSize: 13, color: '#0f172a' }}>${(receipts.service_fee.amount_cents / 100).toFixed(2)} · #{receipts.service_fee.receipt_number}</p>
              {receipts.service_fee.download_url && (
                <a href={receipts.service_fee.download_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2563eb' }}>Download ↗</a>
              )}
            </div>
          )}
          {receipts.contractor_payment && (
            <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#059669' }}>Final Payment Receipt — issued by {receipts.contractor_payment.issuer_legal_name}</p>
              <p style={{ fontSize: 13, color: '#0f172a' }}>${(receipts.contractor_payment.grand_total_cents / 100).toFixed(2)} · #{receipts.contractor_payment.receipt_number}</p>
              {receipts.contractor_payment.download_url && (
                <a href={receipts.contractor_payment.download_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#2563eb' }}>Download ↗</a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
