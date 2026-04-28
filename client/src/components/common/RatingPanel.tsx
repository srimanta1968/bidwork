import { useEffect, useState } from 'react';
import { getRatingForBid, requestContractorRating, submitContractorRating } from '../../services/projectApi';

interface Props {
  bidId: string;
  bidWorkflowState?: string;
  viewerRole: 'homeowner' | 'contractor';
  onChange?: () => void;
}

export default function RatingPanel({ bidId, bidWorkflowState, viewerRole, onChange }: Props) {
  const [rating, setRating] = useState<any>(null);
  const [picked, setPicked] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [reviewText, setReviewText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The rating prompt opens once the receipt is issued.
  const inRatingPhase = bidWorkflowState && ['receipt_issued', 'payment_received'].includes(bidWorkflowState);

  useEffect(() => { if (inRatingPhase) load(); /* eslint-disable-next-line */ }, [bidId, bidWorkflowState]);

  const load = async () => {
    try {
      const r = await getRatingForBid(bidId);
      if (r.success) setRating(r.data);
    } catch { /* silent */ }
  };

  const handleRequest = async () => {
    setError(''); setBusy(true);
    try {
      const r = await requestContractorRating(bidId);
      if (r.success) { setRating(r.data); onChange?.(); }
      else setError(r.error || 'Failed to request rating');
    } catch { setError('Network error'); }
    finally { setBusy(false); }
  };

  const handleSubmit = async () => {
    setError('');
    if (picked < 1 || picked > 5) { setError('Please pick a rating (1-5 stars)'); return; }
    setBusy(true);
    try {
      const r = await submitContractorRating(bidId, picked, reviewText.trim() || undefined);
      if (r.success) { setRating(r.data); onChange?.(); }
      else setError(r.error || 'Failed to submit rating');
    } catch { setError('Network error'); }
    finally { setBusy(false); }
  };

  if (!inRatingPhase) return null;

  // Contractor side — request prompt + status
  if (viewerRole === 'contractor') {
    if (!rating) {
      return (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginTop: 10 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Request a rating from the homeowner</h4>
          <p style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.5, marginBottom: 10 }}>
            The workorder is complete. A rating from this homeowner adds to your public reputation on BidWork — visible to homeowners considering your future bids.
          </p>
          {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{error}</p>}
          <button onClick={handleRequest} disabled={busy}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: busy ? '#93c5fd' : '#2563eb', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            {busy ? 'Requesting…' : 'Request rating'}
          </button>
        </div>
      );
    }
    if (rating.status === 'requested') {
      return (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginTop: 10 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Rating requested · awaiting homeowner</h4>
          <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>
            Requested on {new Date(rating.requested_at).toLocaleString()}. We'll show the rating here once the homeowner submits it.
          </p>
        </div>
      );
    }
    if (rating.status === 'submitted') {
      return (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 12, marginTop: 10 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 4 }}>
            Rated {rating.rating}/5 {'★'.repeat(rating.rating)}{'☆'.repeat(5 - rating.rating)}
          </h4>
          {rating.review_text && <p style={{ fontSize: 12, color: '#065f46', fontStyle: 'italic', margin: '6px 0 0' }}>"{rating.review_text}"</p>}
          <p style={{ fontSize: 11, color: '#065f46', marginTop: 4 }}>Rated on {new Date(rating.rated_at).toLocaleDateString()}</p>
        </div>
      );
    }
    return null;
  }

  // Homeowner side — prompt to rate (only when contractor has requested)
  if (!rating || rating.status !== 'requested') {
    if (rating?.status === 'submitted') {
      return (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginTop: 10 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            Your rating: {rating.rating}/5 {'★'.repeat(rating.rating)}{'☆'.repeat(5 - rating.rating)}
          </h4>
          {rating.review_text && <p style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', margin: '6px 0 0' }}>"{rating.review_text}"</p>}
        </div>
      );
    }
    return null;
  }

  // Star picker
  return (
    <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 10, padding: 12, marginTop: 10 }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>Rate your contractor</h4>
      <p style={{ fontSize: 12, color: '#7c2d12', lineHeight: 1.5, marginBottom: 10 }}>
        The contractor has asked for a rating on the completed workorder. Your rating (1-5 stars) and review will be visible on this contractor's future bids.
      </p>
      {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map(n => {
          const filled = (hovered || picked) >= n;
          return (
            <button key={n} type="button"
              onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
              onClick={() => setPicked(n)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 28, color: filled ? '#f59e0b' : '#cbd5e1', padding: 0, lineHeight: 1 }}>
              {filled ? '★' : '☆'}
            </button>
          );
        })}
        <span style={{ marginLeft: 8, alignSelf: 'center', fontSize: 12, color: '#7c2d12' }}>
          {picked > 0 ? `${picked} / 5` : 'Pick 1-5 stars'}
        </span>
      </div>
      <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={2}
        placeholder="Optional review (visible publicly on this contractor's profile)"
        style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }} />
      <button onClick={handleSubmit} disabled={busy || picked === 0}
        style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: busy || picked === 0 ? '#cbd5e1' : '#d97706', border: 'none', borderRadius: 8, cursor: busy || picked === 0 ? 'not-allowed' : 'pointer' }}>
        {busy ? 'Submitting…' : 'Submit rating'}
      </button>
    </div>
  );
}
