import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getProjectBids, acceptBid, shortlistBid, clearShortlist, selectAndNotify, getProjectBidSummary, rejectBidWithReason, patchBidStatus } from '../../services/projectApi';
import BidAttachmentsPanel from '../../components/common/BidAttachmentsPanel';
import BidMessagesPanel from '../../components/common/BidMessagesPanel';
import ContractPanel from '../../components/common/ContractPanel';
import DepositReceiptsPanel from '../../components/common/DepositReceiptsPanel';
import BidMaterialsReview from '../../components/common/BidMaterialsReview';
import { useAuth } from '../../context/AuthContext';

const WORKFLOW_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Pending', bg: '#f1f5f9', fg: '#64748b' },
  shortlisted: { label: 'Shortlisted', bg: '#eff6ff', fg: '#2563eb' },
  approved_by_owner: { label: 'Notified', bg: '#fef3c7', fg: '#92400e' },
  offer_accepted: { label: 'Accepted Offer', bg: '#ecfdf5', fg: '#059669' },
  contract_drafted: { label: 'Contract Drafted', bg: '#ecfdf5', fg: '#059669' },
  abandoned: { label: 'Abandoned', bg: '#f1f5f9', fg: '#94a3b8' },
};

export default function BidComparisonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmNotify, setConfirmNotify] = useState<any | null>(null);
  const [actingBidId, setActingBidId] = useState<string | null>(null);
  const [rejectingBid, setRejectingBid] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [projResult, bidsResult, summaryResult] = await Promise.all([
        getProject(id!), getProjectBids(id!), getProjectBidSummary(id!),
      ]);
      if (projResult.success) setProject(projResult.data.project);
      if (bidsResult.success) setBids(bidsResult.data.bids || []);
      if (summaryResult.success) setSummary(summaryResult.data.summary);
    } catch { setError('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleAccept = async (bidId: string) => {
    setAccepting(bidId);
    setError('');
    try {
      const result = await acceptBid(bidId);
      if (result.success) {
        setSuccess('Bid accepted! Contractor has been assigned to your project.');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else setError(result.error || 'Failed to accept bid');
    } catch { setError('Network error'); }
    finally { setAccepting(''); }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingBid) return;
    if (rejectReason.trim().length < 10) { setError('Reason must be at least 10 characters'); return; }
    setActingBidId(rejectingBid.id);
    try {
      const result = await rejectBidWithReason(rejectingBid.id, rejectReason.trim());
      if (result.success) {
        setRejectingBid(null); setRejectReason(''); setError('');
        loadData();
      } else setError(result.error || 'Failed to reject');
    } catch { setError('Network error'); }
    finally { setActingBidId(null); }
  };

  const handleStatusChange = async (bidId: string, status: string) => {
    if (status === 'rejected') {
      const bid = bids.find(b => b.id === bidId);
      setRejectingBid(bid); setRejectReason(''); setError('');
      return;
    }
    setActingBidId(bidId); setError('');
    try {
      const result = await patchBidStatus(bidId, { status });
      if (result.success) loadData();
      else setError(result.error || 'Failed to update status');
    } catch { setError('Network error'); }
    finally { setActingBidId(null); }
  };

  const handleShortlist = async (bidId: string, rank: 1 | 2 | 3) => {
    setError(''); setActingBidId(bidId);
    try {
      const result = await shortlistBid(bidId, rank);
      if (result.success) loadData();
      else setError(result.error || 'Failed to shortlist');
    } catch { setError('Network error'); }
    finally { setActingBidId(null); }
  };

  const handleClearShortlist = async (bidId: string) => {
    setError(''); setActingBidId(bidId);
    try {
      const result = await clearShortlist(bidId);
      if (result.success) loadData();
      else setError(result.error || 'Failed to clear shortlist');
    } catch { setError('Network error'); }
    finally { setActingBidId(null); }
  };

  const handleSelectNotify = async (bidId: string) => {
    setError(''); setActingBidId(bidId);
    try {
      const result = await selectAndNotify(bidId);
      if (result.success) {
        setSuccess('Contractor notified — they have 72 working hours to accept.');
        setConfirmNotify(null);
        loadData();
        setTimeout(() => setSuccess(''), 4000);
      } else setError(result.error || 'Failed to notify');
    } catch { setError('Network error'); }
    finally { setActingBidId(null); }
  };

  const approvedBid = bids.find(b => b.selection_workflow_state === 'approved_by_owner');

  if (loading) return <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#64748b' }}>Loading bids...</p></div>;

  const pendingBids = bids.filter(b => b.status === 'pending');
  const acceptedBid = bids.find(b => b.status === 'accepted');

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button onClick={() => navigate('/dashboard')} style={{ fontSize: 14, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 8 }}>&larr; Dashboard</button>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Bids for: {project?.title}</h1>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
          Bid range: ${Number(project?.bid_floor || 0).toLocaleString()} - ${Number(project?.bid_ceiling || 0).toLocaleString()} &middot; {bids.length} bid{bids.length !== 1 ? 's' : ''} received
        </p>

        {success && <div style={{ padding: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, color: '#059669', fontSize: 14, marginBottom: 20 }}>{success}</div>}
        {error && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#dc2626', fontSize: 14, marginBottom: 20 }}>{error}</div>}

        {/* Bids Overview banner */}
        {summary && (
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #4f46e5)', borderRadius: 14, padding: 22, marginBottom: 24, color: 'white' }}>
            {summary.submitted_count === 0 ? (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>AI SUGGESTED START PRICE</p>
                <p style={{ fontSize: 30, fontWeight: 800, marginTop: 4 }}>${Number(summary.effective_start_price_total).toLocaleString()}</p>
                <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>No bids received yet — this is the floor across all tasks.</p>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>BID RANGE · {summary.submitted_count} bid{summary.submitted_count !== 1 ? 's' : ''} received</p>
                  <p style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>
                    ${Number(summary.submitted_low).toLocaleString()} – ${Number(summary.submitted_high).toLocaleString()}
                  </p>
                  <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Average ${Number(summary.average).toLocaleString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>AI START PRICE</p>
                  <p style={{ fontSize: 18, fontWeight: 700 }}>${Number(summary.effective_start_price_total).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accepted Bid Banner */}
        {acceptedBid && (
          <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: 16, padding: 28, marginBottom: 24, color: 'white' }}>
            <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>ACCEPTED BID</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800 }}>{acceptedBid.contractor_name || 'Contractor'}</p>
                <p style={{ fontSize: 14, opacity: 0.8 }}>{acceptedBid.estimated_days} days &middot; {acceptedBid.contractor_category || 'General'}</p>
              </div>
              <p style={{ fontSize: 28, fontWeight: 800 }}>${Number(acceptedBid.bid_amount).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Bid Cards */}
        {bids.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 48, border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💼</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>No bids yet</h2>
            <p style={{ fontSize: 14, color: '#64748b' }}>Contractors are reviewing your project scope. Bids will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {bids.map(bid => {
              const isPending = bid.status === 'pending';
              const isAccepted = bid.status === 'accepted';
              const isRejected = bid.status === 'rejected';

              return (
                <div key={bid.id} style={{ background: 'white', borderRadius: 16, padding: 28,
                  border: isAccepted ? '2px solid #059669' : isRejected ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  opacity: isRejected ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14 }}>
                          {(bid.contractor_name || 'C')[0]}
                        </div>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{bid.contractor_name || 'Contractor'}</h3>
                          <p style={{ fontSize: 12, color: '#94a3b8' }}>{bid.contractor_category || 'General'}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                            {bid.avg_rating != null && bid.rating_count > 0 && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 999, padding: '2px 8px' }}
                                title={`Average rating from ${bid.rating_count} BidWork homeowner${bid.rating_count > 1 ? 's' : ''}.`}>
                                ★ {Number(bid.avg_rating).toFixed(1)} ({bid.rating_count} rating{bid.rating_count > 1 ? 's' : ''})
                              </span>
                            )}
                            {Number(bid.completed_jobs || 0) > 0 && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 999, padding: '2px 8px' }}
                                title="Workorders completed through BidWork.">
                                ✓ {bid.completed_jobs} job{bid.completed_jobs > 1 ? 's' : ''} completed
                              </span>
                            )}
                            {(Number(bid.abandonment_flag_count || 0) > 0 || Number(bid.contractor?.abandonment_flag_count || 0) > 0) && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 999, padding: '2px 8px' }}
                                title="This contractor has been marked as abandoning a workorder by a homeowner or by the system (no response after offer).">
                                ⚠ {Number(bid.abandonment_flag_count || bid.contractor?.abandonment_flag_count || 0)} abandoned
                              </span>
                            )}
                          </div>
                        </div>
                        {isAccepted && <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 4, marginLeft: 8 }}>Accepted</span>}
                        {isRejected && <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 4, marginLeft: 8 }}>Rejected</span>}
                        {bid.selection_workflow_state && bid.selection_workflow_state !== 'pending' && WORKFLOW_BADGE[bid.selection_workflow_state] && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, marginLeft: 6,
                            background: WORKFLOW_BADGE[bid.selection_workflow_state].bg,
                            color: WORKFLOW_BADGE[bid.selection_workflow_state].fg }}>
                            {WORKFLOW_BADGE[bid.selection_workflow_state].label}
                          </span>
                        )}
                      </div>
                      {bid.proposal_notes && <p style={{ fontSize: 14, color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>"{bid.proposal_notes}"</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                      <p style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>${Number(bid.bid_amount).toLocaleString()}</p>
                      <p style={{ fontSize: 13, color: '#64748b' }}>{bid.estimated_days} days</p>
                    </div>
                  </div>

                  {/* Shortlist rank pills + Select & Notify */}
                  {isPending && !acceptedBid && !approvedBid && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Rank:</span>
                      {([1, 2, 3] as const).map(r => {
                        const active = bid.shortlist_rank === r;
                        const label = r === 1 ? 'Top Pick' : r === 2 ? '2nd' : '3rd';
                        return (
                          <button key={r} onClick={() => handleShortlist(bid.id, r)} disabled={actingBidId === bid.id}
                            style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                              border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
                              background: active ? '#2563eb' : 'white',
                              color: active ? 'white' : '#475569' }}>
                            {label}
                          </button>
                        );
                      })}
                      {bid.shortlist_rank && (
                        <button onClick={() => handleClearShortlist(bid.id)} disabled={actingBidId === bid.id}
                          style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                          Clear
                        </button>
                      )}
                      <div style={{ flex: 1 }} />
                      {bid.shortlist_rank && bid.selection_workflow_state === 'shortlisted' && (
                        <button onClick={() => setConfirmNotify(bid)}
                          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
                            background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
                          Select &amp; Notify →
                        </button>
                      )}
                      <button onClick={() => handleAccept(bid.id)} disabled={!!accepting}
                        style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#059669', border: '1px solid #a7f3d0', borderRadius: 8, cursor: accepting ? 'not-allowed' : 'pointer', background: 'white' }}>
                        {accepting === bid.id ? 'Accepting...' : 'Quick Accept'}
                      </button>
                      <select value={bid.selection_workflow_state || 'pending'}
                        onChange={e => handleStatusChange(bid.id, e.target.value)}
                        disabled={actingBidId === bid.id}
                        style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', cursor: 'pointer' }}>
                        <option value="pending">Pending</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="rejected">Reject…</option>
                      </select>
                    </div>
                  )}

                  {bid.selection_workflow_state === 'approved_by_owner' && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: 13, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
                        Contractor notified {bid.approval_notified_at && new Date(bid.approval_notified_at).toLocaleString()}. Awaiting their acceptance.
                      </p>
                    </div>
                  )}

                  <BidMaterialsReview bidId={bid.id} />
                  <ContractPanel bidId={bid.id} bidWorkflowState={bid.selection_workflow_state} viewerRole="homeowner" onChange={loadData} />
                  <DepositReceiptsPanel bidId={bid.id} bidWorkflowState={bid.selection_workflow_state} viewerRole="homeowner" />
                  <BidAttachmentsPanel bidId={bid.id} viewerRole="homeowner" />
                  {user?.id && <BidMessagesPanel bidId={bid.id} viewerRole="homeowner" currentUserId={user.id} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject with reason modal */}
      {rejectingBid && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 24, width: 'min(460px, 95vw)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Reject {rejectingBid.contractor_name || 'this bid'}?</h3>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 12 }}>
              Provide a reason — the contractor will see this on their My Bids view.
            </p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4}
              placeholder="At least 10 characters explaining why this bid isn't a fit"
              style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 8, boxSizing: 'border-box', resize: 'vertical' }} />
            {error && <p style={{ fontSize: 13, color: '#dc2626', marginTop: 8 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button onClick={() => { setRejectingBid(null); setRejectReason(''); setError(''); }}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleRejectSubmit} disabled={actingBidId === rejectingBid.id}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: actingBidId === rejectingBid.id ? '#fca5a5' : '#dc2626' }}>
                {actingBidId === rejectingBid.id ? 'Rejecting...' : 'Reject Bid'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select & Notify confirmation modal */}
      {confirmNotify && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 24, width: 'min(460px, 95vw)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>Notify {confirmNotify.contractor_name || 'this contractor'}?</h3>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>
              BidWork will email this contractor on your behalf and start a <strong>72-working-hour</strong> acceptance window. They must click Accept Offer in that time, or the system will auto-abandon and prompt you to promote the next-ranked bidder.
            </p>
            <p style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: '8px 12px', marginBottom: 16 }}>
              Bid amount: <strong>${Number(confirmNotify.bid_amount).toLocaleString()}</strong> &middot; {confirmNotify.estimated_days} days &middot; Rank {confirmNotify.shortlist_rank}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setConfirmNotify(null)}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#64748b', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => handleSelectNotify(confirmNotify.id)} disabled={actingBidId === confirmNotify.id}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 700, color: 'white', border: 'none', borderRadius: 8,
                  cursor: actingBidId === confirmNotify.id ? 'not-allowed' : 'pointer',
                  background: actingBidId === confirmNotify.id ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
                {actingBidId === confirmNotify.id ? 'Sending...' : 'Send notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
