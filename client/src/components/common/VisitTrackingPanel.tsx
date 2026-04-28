import { useEffect, useState } from 'react';
import { getVisitStatus, postVisitConfirmation, postVisitReminder, abandonNoShow } from '../../services/projectApi';

interface Props {
  bidId: string;
  bidWorkflowState?: string;
  viewerRole: 'homeowner' | 'contractor';
  onChange?: () => void;
}

export default function VisitTrackingPanel({ bidId, bidWorkflowState, viewerRole, onChange }: Props) {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [abandonMode, setAbandonMode] = useState(false);
  const [abandonNote, setAbandonNote] = useState('');

  // Only the homeowner sees the visit-tracking actions; the contractor side
  // shows nothing from this panel until status changes are reflected upstream.
  const isOwner = viewerRole === 'homeowner';

  useEffect(() => { if (isOwner) load(); /* eslint-disable-next-line */ }, [bidId, bidWorkflowState]);

  const load = async () => {
    try {
      const r = await getVisitStatus(bidId);
      if (r.success) setStatus(r.data);
    } catch { /* silent */ }
  };

  const onAction = async (fn: () => Promise<any>, after?: () => void) => {
    setError(''); setBusy(true);
    try {
      const r = await fn();
      if (r.success) { setStatus(r.data); after?.(); onChange?.(); }
      else setError(r.error || 'Action failed');
    } catch { setError('Network error'); }
    finally { setBusy(false); }
  };

  if (!isOwner) return null;
  if (!bidWorkflowState || !['scheduled', 'addresses_revealed'].includes(bidWorkflowState)) return null;
  if (!status) return null;

  // Pre-start-date — informational only
  if (!status.start_date_passed) {
    return (
      <div style={{ background: '#dbeafe', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginTop: 10 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', marginBottom: 4 }}>Workorder Scheduled</h4>
        <p style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.5, margin: 0 }}>
          Deposit paid — addresses revealed. Work is scheduled to start on <strong>{status.proposed_start_date}</strong>. On or after that date, you'll be asked here whether the contractor visited and discussed the work.
        </p>
      </div>
    );
  }

  // Visit confirmed — work is in progress
  if (status.visit_status === 'visit_confirmed') {
    return (
      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 12, marginTop: 10 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 4 }}>Visit confirmed · Work in progress</h4>
        <p style={{ fontSize: 12, color: '#065f46', lineHeight: 1.5, margin: 0 }}>
          You confirmed the contractor visited and discussed the work. The workorder is now in progress.
        </p>
      </div>
    );
  }

  // First check — pending
  if (status.visit_status === 'pending_first_check') {
    return (
      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginTop: 10 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Has the contractor visited and discussed the work?</h4>
        <p style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5, marginBottom: 10 }}>
          The agreed start date ({status.proposed_start_date}) has passed. Please tell us whether the contractor has been in touch and visited the site.
        </p>
        {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onAction(() => postVisitConfirmation(bidId, true))} disabled={busy}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: busy ? '#86efac' : '#059669', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Yes — visit confirmed
          </button>
          <button onClick={() => onAction(() => postVisitConfirmation(bidId, false))} disabled={busy}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#92400e', background: 'white', border: '1px solid #fdba74', borderRadius: 8, cursor: 'pointer' }}>
            No — not yet
          </button>
        </div>
      </div>
    );
  }

  // Reminder offer — owner can send the contractor a nudge
  if (status.visit_status === 'reminder_sent') {
    return (
      <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 10, padding: 12, marginTop: 10 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>Send a reminder to the contractor</h4>
        <p style={{ fontSize: 12, color: '#7c2d12', lineHeight: 1.5, marginBottom: 10 }}>
          You said the contractor hasn't visited yet. Please call them on the phone number revealed after deposit, and use the button below to send a reminder email through BidWork. We'll check back with you after the reminder.
        </p>
        {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{error}</p>}
        <button onClick={() => onAction(() => postVisitReminder(bidId))} disabled={busy}
          style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: busy ? '#fcd34d' : '#d97706', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          {busy ? 'Sending reminder…' : 'Send reminder to contractor'}
        </button>
      </div>
    );
  }

  // Second check — after reminder; confirm visit OR abandon
  if (status.visit_status === 'pending_second_check') {
    return (
      <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, marginTop: 10 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Did the contractor visit after the reminder?</h4>
        <p style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.5, marginBottom: 10 }}>
          Reminder sent {status.reminder_sent_at ? `on ${new Date(status.reminder_sent_at).toLocaleString()}` : 'recently'}. If the contractor still hasn't responded, you can mark the workorder abandoned. The deposit will be transferred as a credit to your next-ranked shortlisted bidder for this project — there is no cash refund (per the work order terms).
        </p>
        {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 6 }}>{error}</p>}
        {!abandonMode ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => onAction(() => postVisitConfirmation(bidId, true))} disabled={busy}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: '#059669', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              Yes — visit confirmed
            </button>
            <button onClick={() => setAbandonMode(true)} disabled={busy}
              style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'white', background: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              No — mark workorder abandoned
            </button>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 6 }}>
              <strong>Confirm abandonment.</strong> The contractor will be flagged with an abandonment on their public reputation, the project will reopen for the next-ranked bidder, and your deposit will become a credit applied to that next bid (no cash refund).
            </p>
            <textarea value={abandonNote} onChange={e => setAbandonNote(e.target.value)} rows={2}
              placeholder="Optional note for the audit log (e.g., contractor stopped responding to calls)"
              style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box', marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onAction(() => abandonNoShow(bidId, abandonNote.trim() || undefined), () => { setAbandonMode(false); setAbandonNote(''); })} disabled={busy}
                style={{ padding: '8px 14px', fontSize: 13, fontWeight: 700, color: 'white', background: '#dc2626', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                {busy ? 'Marking abandoned…' : 'Confirm abandon'}
              </button>
              <button onClick={() => { setAbandonMode(false); setAbandonNote(''); }} disabled={busy}
                style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (status.visit_status === 'owner_marked_abandoned') {
    return (
      <div style={{ background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 10, padding: 12, marginTop: 10 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Workorder abandoned</h4>
        <p style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.5, margin: 0 }}>
          You marked this workorder abandoned. The deposit has been converted into a credit on your project — when you select the next-ranked bidder, the credit will be applied automatically.
        </p>
      </div>
    );
  }

  return null;
}
