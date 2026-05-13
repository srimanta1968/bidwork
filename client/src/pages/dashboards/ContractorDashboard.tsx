import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAvailableProjects, getMyBids, getBillingProfile, presignPaymentProof, confirmPayment, uploadFileToS3 } from '../../services/projectApi';
import AdditionalWorkPanel from '../../components/common/AdditionalWorkPanel';
import BidAttachmentsPanel from '../../components/common/BidAttachmentsPanel';
import BidMessagesPanel from '../../components/common/BidMessagesPanel';
import ContractPanel from '../../components/common/ContractPanel';
import DepositReceiptsPanel from '../../components/common/DepositReceiptsPanel';
import RatingPanel from '../../components/common/RatingPanel';
import BidMaterialsReview from '../../components/common/BidMaterialsReview';
import FeedbackLink from '../../components/common/FeedbackLink';

const PAYMENT_METHODS = [
  { value: 'stripe', label: 'Stripe', placeholder: 'pi_xxxxxxxxxxxxxxxx' },
  { value: 'paypal', label: 'PayPal', placeholder: 'PayPal transaction id' },
  { value: 'bank_transfer', label: 'Bank Transfer', placeholder: 'Confirmation #' },
  { value: 'wire', label: 'Wire', placeholder: 'Wire reference' },
  { value: 'check', label: 'Check', placeholder: 'Check #' },
  { value: 'cash', label: 'Cash', placeholder: 'Receipt #' },
  { value: 'zelle', label: 'Zelle', placeholder: 'Zelle confirmation' },
  { value: 'venmo', label: 'Venmo', placeholder: 'Venmo transaction id' },
  { value: 'crypto', label: 'Crypto', placeholder: 'Tx hash' },
  { value: 'other', label: 'Other', placeholder: 'Reference' },
];

interface PaymentForm {
  payment_method: string;
  transaction_reference: string;
  transaction_date: string;
  contractor_notes: string;
  file: File | null;
  uploading: boolean;
  submitting: boolean;
  error: string;
}

export default function ContractorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const firstName = user?.first_name || 'there';
  const [projects, setProjects] = useState<any[]>([]);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');

  const [paymentBidId, setPaymentBidId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    payment_method: 'bank_transfer', transaction_reference: '', transaction_date: new Date().toISOString().slice(0, 10),
    contractor_notes: '', file: null, uploading: false, submitting: false, error: '',
  });
  const [billingProfileComplete, setBillingProfileComplete] = useState<boolean | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [expandedBids, setExpandedBids] = useState<Record<string, boolean>>({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [projResult, bidResult, billingResult] = await Promise.all([
        getAvailableProjects(), getMyBids(), getBillingProfile(),
      ]);
      if (projResult.success) {
        setProjects(projResult.data.projects || []);
        if (projResult.data.filters?.city) setCityFilter(projResult.data.filters.city);
      }
      if (bidResult.success) setBids(bidResult.data.bids || []);
      if (billingResult.success && billingResult.data?.billing) {
        setBillingProfileComplete(!!billingResult.data.billing.billing_profile_complete);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const openPaymentModal = (bidId: string) => {
    setPaymentBidId(bidId);
    setPaymentSuccess('');
    setPaymentForm({
      payment_method: 'bank_transfer', transaction_reference: '', transaction_date: new Date().toISOString().slice(0, 10),
      contractor_notes: '', file: null, uploading: false, submitting: false, error: '',
    });
  };

  const closePaymentModal = () => setPaymentBidId(null);

  const submitPayment = async () => {
    if (!paymentBidId) return;
    if (!paymentForm.file) { setPaymentForm(p => ({ ...p, error: 'Upload a transaction proof document' })); return; }
    if (!paymentForm.transaction_reference.trim()) { setPaymentForm(p => ({ ...p, error: 'Transaction reference is required' })); return; }
    if (billingProfileComplete === false) {
      setPaymentForm(p => ({ ...p, error: 'Billing profile incomplete. Complete it on your profile before marking payment.' }));
      return;
    }

    const bid = bids.find(b => b.id === paymentBidId);
    if (!bid) { setPaymentForm(p => ({ ...p, error: 'Bid not found' })); return; }
    const amountCents = Math.round(Number(bid.bid_amount) * 100);

    setPaymentForm(p => ({ ...p, submitting: true, uploading: true, error: '' }));
    try {
      const presign = await presignPaymentProof(paymentBidId, paymentForm.file.name, paymentForm.file.type);
      if (!presign.success) { setPaymentForm(p => ({ ...p, submitting: false, uploading: false, error: presign.error || 'Failed to presign upload' })); return; }
      const ok = await uploadFileToS3(presign.data.upload_url, paymentForm.file);
      if (!ok) { setPaymentForm(p => ({ ...p, submitting: false, uploading: false, error: 'Proof upload failed' })); return; }

      setPaymentForm(p => ({ ...p, uploading: false }));
      const result = await confirmPayment(paymentBidId, {
        payment_method: paymentForm.payment_method,
        transaction_reference: paymentForm.transaction_reference.trim(),
        transaction_date: paymentForm.transaction_date,
        transaction_amount_cents: amountCents,
        proof_s3_key: presign.data.s3_key,
        contractor_notes: paymentForm.contractor_notes || undefined,
      });
      if (result.success) {
        setPaymentSuccess('Payment recorded — project marked complete.');
        setPaymentBidId(null);
        loadData();
      } else {
        setPaymentForm(p => ({ ...p, submitting: false, error: result.error || 'Failed to record payment' }));
      }
    } catch (e: any) {
      setPaymentForm(p => ({ ...p, submitting: false, uploading: false, error: e?.message || 'Network error' }));
    }
  };

  const wonBids = bids.filter(b => b.status === 'accepted').length;

  const stats = [
    { label: 'Available Jobs', value: projects.length.toString(), icon: '📋', color: '#2563eb' },
    { label: 'My Bids', value: bids.length.toString(), icon: '💼', color: '#7c3aed' },
    { label: 'Jobs Won', value: wonBids.toString(), icon: '🏆', color: '#059669' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <nav style={{ background: 'white', borderBottom: '1px solid #f1f5f9', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 14 }}>B</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>BidWork</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'white', background: '#059669', padding: '4px 10px', borderRadius: 20 }}>Contractor</span>
          <button onClick={() => navigate('/profile')} style={{ fontSize: 13, fontWeight: 500, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>My Profile</button>
          <button onClick={() => navigate('/catalogs')} style={{ fontSize: 13, fontWeight: 500, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>My Catalogs</button>
          <FeedbackLink context="general" />
          <span style={{ fontSize: 14, color: '#64748b' }}>{user?.email}</span>
          <button onClick={logout} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 16px', cursor: 'pointer' }}>Logout</button>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Welcome, {firstName} 🔨</h1>
            <p style={{ fontSize: 15, color: '#64748b' }}>
              {cityFilter && cityFilter !== 'All Areas' ? `Showing jobs in ${cityFilter}` : 'Showing all available jobs.'}
              {cityFilter === 'All Areas' && <span style={{ fontSize: 13, color: '#2563eb', cursor: 'pointer', marginLeft: 8 }} onClick={() => navigate('/profile')}>Set your service area &rarr;</span>}
            </p>
          </div>
          <button onClick={() => navigate('/jobs')} style={{ padding: '12px 24px', fontSize: 14, fontWeight: 600, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
            Browse All Jobs
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: 'white', borderRadius: 14, padding: 24, border: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>{s.label}</span>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {paymentSuccess && (
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: '12px 16px', color: '#059669', marginBottom: 20, fontSize: 14 }}>{paymentSuccess}</div>
        )}

        {/* My Bids */}
        {bids.length > 0 && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>My Bids</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
              {bids.map((b: any) => {
                const statusColors: Record<string, { bg: string; fg: string }> = {
                  pending: { bg: '#fef3c7', fg: '#92400e' },
                  accepted: { bg: '#ecfdf5', fg: '#059669' },
                  rejected: { bg: '#fef2f2', fg: '#dc2626' },
                  withdrawn: { bg: '#f1f5f9', fg: '#64748b' },
                };
                const color = statusColors[b.status] || statusColors.pending;
                // Mark Payment Received only fires when the homeowner has acknowledged
                // job completion. Pre-deposit / pre-completion stages render the
                // ContractPanel + DepositReceiptsPanel which guide the contractor
                // through what's expected next.
                const canMarkPaid = b.selection_workflow_state === 'completion_acknowledged'
                  || b.selection_workflow_state === 'in_progress';
                const isPaused = b.selection_workflow_state === 'paused';
                const isAccepted = b.status === 'accepted';
                const isExpanded = !!expandedBids[b.id];
                return (
                  <div key={b.id} style={{ background: 'white', borderRadius: 14, padding: 18, border: '1px solid #f1f5f9' }}>
                    <div onClick={() => setExpandedBids(prev => ({ ...prev, [b.id]: !prev[b.id] }))}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                          {b.project_title || 'Project'}
                        </p>
                        <p style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                          ${Number(b.bid_amount || 0).toLocaleString()} &middot; {b.estimated_days} days
                          {b.project_category && <span style={{ color: '#94a3b8' }}> &middot; {b.project_category}</span>}
                          {b.project_city && <span style={{ color: '#94a3b8' }}> &middot; {b.project_city}{b.project_zip ? ` ${b.project_zip}` : ''}</span>}
                        </p>
                        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Submitted {new Date(b.created_at).toLocaleDateString()}</p>
                        {isPaused && (
                          <p style={{ fontSize: 12, color: '#475569', background: '#f1f5f9', borderRadius: 6, padding: '4px 8px', marginTop: 6, display: 'inline-block' }}>
                            Paused — another contractor is currently in contracting on this project. Your bid will resume automatically if their contract falls through.
                          </p>
                        )}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: color.bg, color: color.fg }}>
                        {isPaused ? 'paused' : b.status}
                      </span>
                      {canMarkPaid && (
                        <button onClick={e => { e.stopPropagation(); openPaymentModal(b.id); }}
                          style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                          Mark Payment Received
                        </button>
                      )}
                      <span aria-label={isExpanded ? 'Collapse bid details' : 'Expand bid details'}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', color: '#475569', fontSize: 22, lineHeight: 1, flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.15s, background 0.15s' }}>▾</span>
                    </div>

                    {isExpanded && b.project_description && (
                      <div onClick={e => e.stopPropagation()} style={{ marginTop: 12, padding: '10px 14px', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Project scope</p>
                        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{b.project_description}</p>
                      </div>
                    )}
                    {isExpanded && (
                      <div onClick={e => e.stopPropagation()}>
                        <BidMaterialsReview bidId={b.id} />
                      </div>
                    )}
                    {b.status === 'rejected' && b.rejection_reason && (
                      <div style={{ marginTop: 10, padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 2 }}>Homeowner declined this bid</p>
                        <p style={{ fontSize: 13, color: '#92400e' }}>{b.rejection_reason}</p>
                        {b.status_updated_at && <p style={{ fontSize: 11, color: '#a16207', marginTop: 4 }}>{new Date(b.status_updated_at).toLocaleString()}</p>}
                      </div>
                    )}
                    {/* Always visible: the action panel so the contractor can Accept Offer / Sign / etc. */}
                    <ContractPanel bidId={b.id} bidWorkflowState={b.selection_workflow_state} viewerRole="contractor" onChange={loadData} />
                    <RatingPanel bidId={b.id} bidWorkflowState={b.selection_workflow_state} viewerRole="contractor" onChange={loadData} />

                    {isExpanded && (
                      <div onClick={e => e.stopPropagation()}>
                        <DepositReceiptsPanel bidId={b.id} bidWorkflowState={b.selection_workflow_state} viewerRole="contractor" />
                        <BidAttachmentsPanel bidId={b.id} viewerRole="contractor" />
                        {user?.id && <BidMessagesPanel bidId={b.id} viewerRole="contractor" currentUserId={user.id} />}
                        {isAccepted && <AdditionalWorkPanel bidId={b.id} viewerRole="contractor" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Latest Projects in your city */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
          {cityFilter ? `Jobs in ${cityFilter}` : 'Latest Available Jobs'}
        </h2>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>Loading jobs...</div>
        ) : projects.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 14, padding: 32, border: '1px solid #f1f5f9', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 14, color: '#94a3b8' }}>No jobs available in your area yet. Check back soon!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {projects.slice(0, 10).map((p: any) => (
              <div key={p.id} onClick={() => navigate(`/jobs?project=${p.id}`)}
                style={{ background: 'white', borderRadius: 14, padding: 20, border: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#f1f5f9'; e.currentTarget.style.boxShadow = 'none'; }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{p.title}</h3>
                  <p style={{ fontSize: 13, color: '#94a3b8' }}>
                    {p.category || 'General'} &middot; {p.location_address || 'Location hidden'} &middot; {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {p.bid_floor && (
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>${Number(p.bid_floor).toLocaleString()} - ${Number(p.bid_ceiling).toLocaleString()}</p>
                  )}
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>View & Bid &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mark Payment Received modal */}
      {paymentBidId && (() => {
        const bid = bids.find(b => b.id === paymentBidId);
        if (!bid) return null;
        const method = PAYMENT_METHODS.find(m => m.value === paymentForm.payment_method)!;
        const billingIncomplete = billingProfileComplete === false;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 28, width: 'min(560px, 95vw)', maxHeight: '90vh', overflow: 'auto' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Mark Payment Received</h3>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                BidWork records the transaction; you process the payment outside our platform. Upload your transaction
                record so the homeowner can see it on their final receipt.
              </p>

              {billingIncomplete && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 13 }}>
                  Your billing profile is incomplete. <Link to="/profile" style={{ color: '#92400e', fontWeight: 700 }}>Complete it</Link> before recording payment so we can issue your receipt.
                </div>
              )}

              {paymentForm.error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>{paymentForm.error}</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Payment Method</label>
                    <select value={paymentForm.payment_method}
                      onChange={e => setPaymentForm(p => ({ ...p, payment_method: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }}>
                      {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Transaction Date</label>
                    <input type="date" value={paymentForm.transaction_date}
                      onChange={e => setPaymentForm(p => ({ ...p, transaction_date: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8 }} />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Transaction Reference</label>
                  <input value={paymentForm.transaction_reference}
                    onChange={e => setPaymentForm(p => ({ ...p, transaction_reference: e.target.value }))}
                    placeholder={method.placeholder}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8 }} />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Amount</label>
                  <input value={`$${Number(bid.bid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} readOnly
                    style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f8fafc', color: '#475569' }} />
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Must match the bid total exactly. Pre-filled from your accepted bid.</p>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Transaction Proof (PDF or image)</label>
                  <input type="file" accept="application/pdf,image/png,image/jpeg"
                    onChange={e => setPaymentForm(p => ({ ...p, file: e.target.files?.[0] || null }))} />
                  {paymentForm.file && <p style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>{paymentForm.file.name} &middot; {Math.round(paymentForm.file.size / 1024)} KB</p>}
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Notes (optional)</label>
                  <textarea rows={2} value={paymentForm.contractor_notes}
                    onChange={e => setPaymentForm(p => ({ ...p, contractor_notes: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, resize: 'vertical' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button onClick={closePaymentModal} disabled={paymentForm.submitting}
                  style={{ padding: '10px 18px', fontSize: 14, fontWeight: 600, color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={submitPayment} disabled={paymentForm.submitting || billingIncomplete}
                  style={{ padding: '10px 22px', fontSize: 14, fontWeight: 700, color: 'white', border: 'none', borderRadius: 10, cursor: paymentForm.submitting || billingIncomplete ? 'not-allowed' : 'pointer',
                    background: paymentForm.submitting || billingIncomplete ? '#93c5fd' : 'linear-gradient(135deg, #059669, #10b981)' }}>
                  {paymentForm.uploading ? 'Uploading proof...' : paymentForm.submitting ? 'Recording...' : 'Record Payment & Close Project'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
