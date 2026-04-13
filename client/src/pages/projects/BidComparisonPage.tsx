import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, getProjectBids, acceptBid, rejectBid } from '../../services/projectApi';

export default function BidComparisonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [projResult, bidsResult] = await Promise.all([getProject(id!), getProjectBids(id!)]);
      if (projResult.success) setProject(projResult.data.project);
      if (bidsResult.success) setBids(bidsResult.data.bids || []);
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

  const handleReject = async (bidId: string) => {
    try {
      await rejectBid(bidId);
      setBids(bids.map(b => b.id === bidId ? { ...b, status: 'rejected' } : b));
    } catch { setError('Failed to reject bid'); }
  };

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
                        </div>
                        {isAccepted && <span style={{ fontSize: 12, fontWeight: 600, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: 4, marginLeft: 8 }}>Accepted</span>}
                        {isRejected && <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 4, marginLeft: 8 }}>Rejected</span>}
                      </div>
                      {bid.proposal_notes && <p style={{ fontSize: 14, color: '#64748b', marginTop: 8, lineHeight: 1.6 }}>"{bid.proposal_notes}"</p>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                      <p style={{ fontSize: 24, fontWeight: 800, color: '#0f172a' }}>${Number(bid.bid_amount).toLocaleString()}</p>
                      <p style={{ fontSize: 13, color: '#64748b' }}>{bid.estimated_days} days</p>
                    </div>
                  </div>

                  {isPending && !acceptedBid && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                      <button onClick={() => handleAccept(bid.id)} disabled={!!accepting}
                        style={{ flex: 1, padding: '10px 20px', fontSize: 14, fontWeight: 700, color: 'white', border: 'none', borderRadius: 8, cursor: accepting ? 'not-allowed' : 'pointer',
                          background: accepting === bid.id ? '#93c5fd' : 'linear-gradient(135deg, #059669, #10b981)' }}>
                        {accepting === bid.id ? 'Accepting...' : 'Accept Bid'}
                      </button>
                      <button onClick={() => handleReject(bid.id)}
                        style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', background: 'white' }}>
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
